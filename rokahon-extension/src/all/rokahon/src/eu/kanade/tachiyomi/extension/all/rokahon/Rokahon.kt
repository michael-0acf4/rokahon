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
import uy.kohesive.injekt.Injekt
import uy.kohesive.injekt.api.get
import uy.kohesive.injekt.injectLazy
import java.util.concurrent.TimeUnit

class Rokahon : ConfigurableSource, UnmeteredSource, HttpSource() {
    override val name = "Rokahon"

    companion object {
        private const val ADDRESS_TITLE = "Server URL Address"
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

    override fun pageListParse(response: Response): List<Page> {
        println("Page list parse" + response.request.url)
//        var rokaResponse = json.decodeFromString<RokahonResponse>(response.body.string())
//        var book = rokaResponse.data[0]
        return arrayListOf<Page>()
    }

    override fun chapterListParse(response: Response): List<SChapter> {
        var rokaResponse = json.decodeFromString<RokahonResponse>(response.body.string())
        var book = rokaResponse.data[0]

        var chapters = arrayListOf<SChapter>()

        for (chap in book.chapters) {
            chapters.add(
                SChapter.create().apply {
                    name = chap.title
                },
            )
        }

        return chapters
    }

    override fun mangaDetailsParse(response: Response): SManga {
        println("mangaDetailsParse " + response.request.url)
        var rokaResponse = json.decodeFromString<RokahonResponse>(response.body.string())
        var book = rokaResponse.data[0]
        return SManga.create().apply {
            url = "$baseUrl/search?keyword=" + book.title
            title = title
            thumbnail_url = "$baseUrl/image?id=" + book.cover.id
            genre = ""
            status = SManga.ONGOING
            initialized = true
        }
    }

    override fun popularMangaParse(response: Response): MangasPage {
        return searchMangaParse(response)
    }

    override fun searchMangaParse(response: Response): MangasPage {
        println("searchMangaParse")
        var rokaResponse = json.decodeFromString<RokahonResponse>(response.body.string())

        var items = arrayListOf<SManga>()
        for (book in rokaResponse.data) {
            var manga = SManga.create().apply {
                title = book.title
                url = "$baseUrl/search?keyword=" + book.title
                thumbnail_url = "$baseUrl/image?id=" + book.cover.id
                genre = ""
                status = SManga.ONGOING
                initialized = true
            }
            items.add(manga)
        }

        println("Manga count " + items.size)

        var hasNextPage = false
        return MangasPage(items, hasNextPage)
    }

    override fun popularMangaRequest(page: Int) = searchMangaRequest(1, "", FilterList())

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

    // Settings/UI

    override fun setupPreferenceScreen(screen: PreferenceScreen) {
        screen.addPreference(screen.editTextPreference(ADDRESS_TITLE, ADDRESS_DEFAULT, baseUrl, false, "i.e. http://192.168.1.115:4567"))
    }

    private val preferences: SharedPreferences by lazy {
        Injekt.get<Application>().getSharedPreferences("source_$id", 0x0000)
    }

    // OTHER

    override fun headersBuilder(): Headers.Builder = Headers.Builder().apply {
        // @TODO
        // add("Authorization", pwd)
        println(GET("http://192.168.1.170:1770/search?keyword=Otaku"))
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
