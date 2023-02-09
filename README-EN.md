[中文文档](https://github.com/KyleChoy/zotero-pdf-translate/blob/CustomDeepL/README.md)

This is a fork of [Zotero PDF Translate](https://github.com/windingwind/zotero-pdf-translate), providing DeepL engine for users who have troubles creating accounts.

# Configuration
## Introduction

By reverse engineering DeepL client, [zu1k](https://github.com/zu1k) provides access to DeepL without creating accounts.

## How-to

**1. Install Docker**

See [Docker Website](https://www.docker.com/).

**2. Pull Image**

Run in terminal:

```Shell
docker pull kanikig/deepl-bk
```

zu1k has deleted the image, therefore using a backup from [KANIKIG](https://github.com/KANIKIG).

**3. Deploy DeepL Service**

Mac(Intel) and Windows ：

```Shell
docker run -itd -p 8080:80 kanikig/deepl-bk 
```

Mac(M1/M2)：

```Shell
docker run --platform linux/amd64 -p 8080:80 -itd kanikig/deepl-bk
```

8080 is the port where the service will be running on. It can be modified to any other available port.

**4. Configure in Zotero**

Zotero -> Preferences -> PDF Translate -> Services -> DeepL(Custom), enter URL in the secret section. If you follow as above, the URL should be: http://127.0.0.1:8080/translate

## Reference

[Mac 翻译软件Bob，使用免费DeepL API](https://zhuanlan.zhihu.com/p/484946276)

[求助 zu1k/deepl 镜像](https://github.com/clubxdev/bob-plugin-deeplx/issues/2)

[zu1k的项目](https://zu1k.com/projects/#deepl-free-api)