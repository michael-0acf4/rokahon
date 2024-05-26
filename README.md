# Rokahon

<p align="center">
  <img src="misc/res/mipmap-hdpi/ic_launcher.png">
</p>

Rokahon (or ローカル本) is a simple server for your local gallery, you can
browse local files through apps similar to Mihon or just use it as a simple REST
endpoint.

## Rokahon Mihon Extension

Rokahon android extension for Mihon or any Tachyomi-like apps.

TODO

## Rokahon server

A very basic server that automatically scans and cache a list of directories.

For example, with the configuration..

```json
{
  "PORT": 1770,
  "CACHE": true,
  "LIBRARY_ROOT": [
    "path/to/lib1",
    "other/lib2"
  ]
}
```

Rōkahon will serve any subdirectory that follows the structure
`title > chapters > pages`

```
path/to/lib1/..
   bookTitle
     chapter1
       1.ext
       2.ext
       ..
     chapter2
       1.ext
       ..

other/lib2/..
   bookTitle
     chapter1
       a.ext
       ..
     chapter2
       a.ext
       ..
```
