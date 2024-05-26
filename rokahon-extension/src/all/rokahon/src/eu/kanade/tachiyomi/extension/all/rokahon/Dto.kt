package eu.kanade.tachiyomi.extension.all.rokahon
import kotlinx.serialization.Serializable

@Serializable
data class RokahonResponse<T>(
    val isError: Boolean,
    val data: T,
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
data class RokahonSimpChapter(
    val title: String,
    val id: String,
)

@Serializable
data class RokahonSimpBook(
    val id: String,
    val title: String,
    val cover: RokahonImage,
    val chapters: List<RokahonSimpChapter>,
    val authors: List<String>,
    val tags: List<String>,
)
