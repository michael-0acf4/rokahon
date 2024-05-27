package eu.kanade.tachiyomi.extension.all.rokahon

import android.app.Application
import android.content.SharedPreferences
import android.text.InputType
import android.util.Log
import android.widget.Toast
import androidx.preference.EditTextPreference
import androidx.preference.PreferenceScreen
import eu.kanade.tachiyomi.network.GET
import eu.kanade.tachiyomi.source.ConfigurableSource
import eu.kanade.tachiyomi.source.UnmeteredSource
import eu.kanade.tachiyomi.source.model.FilterList
import eu.kanade.tachiyomi.source.model.MangasPage
import eu.kanade.tachiyomi.source.model.Page
import eu.kanade.tachiyomi.source.model.SChapter
import eu.kanade.tachiyomi.source.model.SManga
import eu.kanade.tachiyomi.source.online.HttpSource
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import okhttp3.Dns
import okhttp3.Headers
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import rx.Observable
import uy.kohesive.injekt.Injekt
import uy.kohesive.injekt.api.get
import uy.kohesive.injekt.injectLazy
import java.util.concurrent.TimeUnit

class Rokahon : ConfigurableSource, UnmeteredSource, HttpSource() {
    override val name = "Rokahon"

    companion object {
        private const val ADDRESS_TITLE = "Server URL"
        private const val ADDRESS_DEFAULT = "http://192.168.1.170:1770"
    }
    override val baseUrl by lazy { preferences.getString(ADDRESS_TITLE, ADDRESS_DEFAULT)!! }

    private val json: Json by injectLazy()

    override val client: OkHttpClient =
        network.client.newBuilder()
            .dns(Dns.SYSTEM)
            .callTimeout(120, TimeUnit.SECONDS)
            .build()

    override val lang = "all"
    override val supportsLatest = false

    override fun latestUpdatesRequest(page: Int): Request = throw Exception("Not supported")
    override fun latestUpdatesParse(response: Response): MangasPage = throw Exception("Not supported")
    override fun imageUrlParse(response: Response): String = throw Exception("Not supported")

    // MANGA SEARCH + PARSE
    override fun searchMangaRequest(page: Int, query: String, filters: FilterList): Request {
        // Response will be available in searchMangaParse
        println("FN_CALL searchMangaRequest")
        val url = "$baseUrl/search"
            .toHttpUrl()
            .newBuilder()
            .addQueryParameter("keyword", query)
            .addQueryParameter("page", page.toString())
            .build()
        return GET(url, headers)
    }

    override fun searchMangaParse(response: Response): MangasPage {
        println("FN_CALL searchMangaParse")
        var rokaResponse = json.decodeFromString<RokahonResponse<List<RokahonSimpBook>>>(response.body.string())
        if (rokaResponse.isError) {
            val msg = rokaResponse.data.toString()
            Log.e("Search", msg)
            throw Exception(msg)
        }

        var items = arrayListOf<SManga>()
        for (book in rokaResponse.data) {
            items.add(
                SManga.create().apply {
                    title = book.title
                    url = "$baseUrl/book/" + book.id
                    thumbnail_url = "$baseUrl/image?id=" + book.cover.id
                    status = SManga.ONGOING
                },
            )
        }

        return MangasPage(items, false)
    }

    // POPULAR MANGA REQUEST + PARSE
    override fun popularMangaRequest(page: Int) = searchMangaRequest(1, "", FilterList())

    override fun popularMangaParse(response: Response) = searchMangaParse(response)

    // MANGA DETAILS
    override fun fetchMangaDetails(manga: SManga): Observable<SManga> {
        println("FN_CALL fetchMangaDetails " + manga.title + " :: " + manga.url)
        return Observable.just(manga)
    }

    override fun mangaDetailsParse(response: Response) = throw UnsupportedOperationException("mangaDetailsParse :: Not used")

    // CHAPTER LIST + PARSE
    override fun chapterListRequest(manga: SManga): Request {
        println("FN_CALL chapterListRequest " + manga.title + " :: " + manga.url)
        return GET(manga.url, headers)
    }

    override fun chapterListParse(response: Response): List<SChapter> {
        println("FN_CALL chapterListParse " + response.request.url)
        val rokaResponse = json.decodeFromString<RokahonResponse<RokahonSimpBook>>(response.body.string())
        if (rokaResponse.isError) {
            val msg = rokaResponse.data.toString()
            Log.e("Search", msg)
            throw Exception(msg)
        }
        val book = rokaResponse.data
        return book.chapters.map {
            SChapter.create().apply {
                url = "$baseUrl/chapter/" + book.id + "/" + it.id
                name = it.title
            }
        }
    }

    // PAGE
    override fun pageListRequest(chapter: SChapter): Request {
        println("FN_CALL pageListRequest " + chapter.url)
        return GET(chapter.url, headers)
    }

    override fun pageListParse(response: Response): List<Page> {
        println("FN_CALL pageListParse " + response.request.url)
        val rokaResponse = json.decodeFromString<RokahonResponse<RokahonChapter>>(response.body.string())
        if (rokaResponse.isError) {
            val msg = rokaResponse.data.toString()
            Log.e("Search", msg)
            throw Exception(msg)
        }
        val chapter = rokaResponse.data
        return chapter.pages.map {
            Page(
                index = it.number,
                imageUrl = "$baseUrl/image?id=" + it.image.id,
            )
        }
    }

    // Settings/UI

    override fun setupPreferenceScreen(screen: PreferenceScreen) {
        screen.addPreference(screen.editTextPreference(ADDRESS_TITLE, ADDRESS_DEFAULT, baseUrl, false, "i.e. http://192.168.1.115:4567"))
    }

    private val preferences: SharedPreferences by lazy {
        Injekt.get<Application>().getSharedPreferences("source_$id", 0x0000)
    }

    override fun headersBuilder(): Headers.Builder = Headers.Builder().apply {
        // @TODO
        println("Building headers (add authorization?)")
    }

    private fun PreferenceScreen.editTextPreference(title: String, default: String, value: String, isPassword: Boolean = false, placeholder: String): EditTextPreference {
        return EditTextPreference(context).apply {
            key = title
            this.title = title
            summary = value.ifEmpty { placeholder }
            this.setDefaultValue(default)
            dialogTitle = title

            if (isPassword) {
                setOnBindEditTextListener {
                    it.inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
                }
            }

            setOnPreferenceChangeListener { _, newValue ->
                try {
                    val res = preferences.edit().putString(title, newValue as String).commit()
                    Toast.makeText(context, "Restart Tachiyomi to apply new setting.", Toast.LENGTH_LONG).show()
                    res
                } catch (e: Exception) {
                    Log.e("Rokahon", "Exception while setting text preference", e)
                    false
                }
            }
        }
    }
}
