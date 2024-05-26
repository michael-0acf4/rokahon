package eu.kanade.tachiyomi.extension.all.rokahon
import kotlinx.serialization.Serializable

@Serializable
data class RokahonResponse(
    val isError: Boolean,
    val data: List<RokahonBook>,
)

@Serializable
data class RokahonImage(
    val path: String,
    val ext: String,
    val id: String,
)

@Serializable
data class RokahonPage(
    val number: Int,
    val image: RokahonImage,
)

@Serializable
data class RokahonChapter(
    val title: String,
    val pages: List<RokahonPage>,
    val path: String,
)

@Serializable
data class RokahonBook(
    val title: String,
    val cover: RokahonImage,
    val chapters: List<RokahonChapter>,
    val authors: List<String>,
    val tags: List<String>,
    val path: String,
)
