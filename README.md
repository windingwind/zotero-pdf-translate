[English](https://github.com/KyleChoy/zotero-pdf-translate/blob/CustomDeepL/README-EN.md)

本项目 fork 自 [Zotero PDF Translate](https://github.com/windingwind/zotero-pdf-translate)。

由于各种原因，在国内注册 DeepL 的免费计划都十分困难。本项目可让用户在不注册账号的前提下，使用 DeepL 作为翻译服务。

# 配置
## 简介

[zu1k](https://github.com/zu1k) 通过逆向 DeepL 客户端使用的协议，实现免费的 DeepL API。

## 具体步骤

**1. 安装 Docker**

参考： [Docker 官网](https://www.docker.com/)

**2. 拉取镜像**

在终端中执行：

```Shell
docker pull kanikig/deepl-bk
```

由于原作者 zu1k 已删除镜像，因而使用 [KANIKIG](https://github.com/KANIKIG) 的备份。

**3. 部署 DeepL 服务**

Mac（Intel）和 Windows ：

```Shell
docker run -itd -p 8080:80 kanikig/deepl-bk 
```


Mac（M1/M2）：

```Shell
docker run --platform linux/amd64 -p 8080:80 -itd kanikig/deepl-bk
```


其中，8080 是服务运行的端口，可以修改为其他数值。

**4. 在 Zotero 中配置**

打开 Zotero - 选项 - 翻译 - 翻译引擎 - DeepL(自定义)，在密钥中输入网址。如果按照上完进行配置，则链接为： http://127.0.0.1:8080/translate。

## 参考链接

如果访问速度慢，可参考 [Mac 翻译软件Bob，使用免费DeepL API](https://zhuanlan.zhihu.com/p/484946276) 设置代理。

其他参考链接：

[求助 zu1k/deepl 镜像](https://github.com/clubxdev/bob-plugin-deeplx/issues/2)

[zu1k的项目](https://zu1k.com/projects/#deepl-free-api)
