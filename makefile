COMPILE_TIME=$(shell date +"%Y-%m-%d %H:%M:%S")
all: builddir clean
ifdef VERSION
	awk '/em:version=/ { $$0="        em:version=\"${VERSION}\""} { print }' install.rdf > install.rdf.temp && mv install.rdf.temp install.rdf
	awk '/<em:version>/ { $$0="            <em:version>${VERSION}</em:version>"} { print }' update.rdf > update.rdf.temp && mv update.rdf.temp update.rdf
	awk '/<!ENTITY zotero.zoteropdftranslate.help.version.label/ { $$0="<!ENTITY zotero.zoteropdftranslate.help.version.label \"Zotero PDF Translate 版本 ${VERSION}\">"} { print }' chrome/locale/zh-CN/overlay.dtd > chrome/locale/zh-CN/overlay.dtd.temp && mv chrome/locale/zh-CN/overlay.dtd.temp chrome/locale/zh-CN/overlay.dtd
	awk '/<!ENTITY zotero.zoteropdftranslate.help.version.label/ { $$0="<!ENTITY zotero.zoteropdftranslate.help.version.label \"Zotero PDF Translate VERSION ${VERSION}\">"} { print }' chrome/locale/en-US/overlay.dtd > chrome/locale/en-US/overlay.dtd.temp && mv chrome/locale/en-US/overlay.dtd.temp chrome/locale/en-US/overlay.dtd
	awk '/<!ENTITY zotero.zoteropdftranslate.help.releasetime.label/ { $$0="<!ENTITY zotero.zoteropdftranslate.help.releasetime.label \"Build ${COMPILE_TIME}\">"} { print }' chrome/locale/zh-CN/overlay.dtd > chrome/locale/zh-CN/overlay.dtd.temp && mv chrome/locale/zh-CN/overlay.dtd.temp chrome/locale/zh-CN/overlay.dtd
	awk '/<!ENTITY zotero.zoteropdftranslate.help.releasetime.label/ { $$0="<!ENTITY zotero.zoteropdftranslate.help.releasetime.label \"Build ${COMPILE_TIME}\">"} { print }' chrome/locale/en-US/overlay.dtd > chrome/locale/en-US/overlay.dtd.temp && mv chrome/locale/en-US/overlay.dtd.temp chrome/locale/en-US/overlay.dtd
	zip -r builds/zotero-pdf-translate.xpi chrome/* chrome.manifest install.rdf
else
	$(error VERSION variable not defined. Please define it.)
endif

builddir:
	mkdir -p builds

clean:
	rm -f builds/*
