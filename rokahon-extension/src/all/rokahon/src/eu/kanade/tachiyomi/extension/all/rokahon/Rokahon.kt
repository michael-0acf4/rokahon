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
    override fun pageListParse(response: Response): List<Page> = throw UnsupportedOperationException("Not used")

    // MANGA SEARCH + PARSE
    override fun searchMangaRequest(page: Int, query: String, filters: FilterList): Request {
        // Response will be available in searchMangaParse
        println("searchMangaRequest")
        val url = "$baseUrl/search"
            .toHttpUrl()
            .newBuilder()
            .addQueryParameter("keyword", query)
            .addQueryParameter("page", page.toString())
            .build()
        return GET(url, headers)
    }
    override fun searchMangaParse(response: Response): MangasPage {
        println("searchMangaParse")
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
                    genre = "sample"
                    status = SManga.ONGOING
                },
            )
        }

        return MangasPage(items, false)
    }

    // POPULAR MANGA REQUEST + PARSE
    override fun popularMangaRequest(page: Int) = searchMangaRequest(1, "", FilterList())

    override fun popularMangaParse(response: Response): MangasPage {
        return searchMangaParse(response)
    }

    // MANGA DETAILS
    override fun fetchMangaDetails(manga: SManga): Observable<SManga> {
        println("fetchMangaDetails " + manga.title)
        return Observable.just(manga)
    }

    override fun mangaDetailsRequest(manga: SManga): Request {
        println("mangaDetailsRequest " + manga.title)
        return super.mangaDetailsRequest(manga)
    }

    override fun mangaDetailsParse(response: Response) = throw UnsupportedOperationException("Not used.")

    // CHAPTER LIST + PARSE
//    override fun prepareNewChapter(chapter: SChapter, manga: SManga) {
//        println("prepareNewChapter " + chapter.url)
//        super.prepareNewChapter(chapter, manga)
//    }

    override fun fetchChapterList(manga: SManga): Observable<List<SChapter>> {
        println("fetchChapterList " + manga.title)
        var response = GET(manga.url, headers)
        val rokaResponse = json.decodeFromString<RokahonResponse<RokahonSimpBook>>(response.body.toString())
        if (rokaResponse.isError) {
            val msg = rokaResponse.data.toString()
            Log.e("Search", msg)
        }
        val book = rokaResponse.data
        val chapters = book.chapters.map {
            SChapter.create().apply {
                url = "$baseUrl/pages/" + book.id + "/" + it.id
                name = it.title
            }
        }
        return Observable.just(chapters)
    }

    override fun chapterListRequest(manga: SManga): Request {
        println("chapterListRequest " + manga.title + " :: " + manga.url)
        return GET(manga.url, headers)
    }

    override fun chapterListParse(response: Response): List<SChapter> {
        println("chapterListParse " + response.request.url)
        val rokaResponse = json.decodeFromString<RokahonResponse<RokahonSimpBook>>(response.body.toString())
        if (rokaResponse.isError) {
            val msg = rokaResponse.data.toString()
            Log.e("Search", msg)
            throw Exception(msg)
        }
        val book = rokaResponse.data
        return book.chapters.map {
            SChapter.create().apply {
                url = "$baseUrl/pages/" + book.id + "/" + it.id
                name = it.title
            }
        }
    }

    override fun pageListRequest(chapter: SChapter): Request {
        TODO("page list request")
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
