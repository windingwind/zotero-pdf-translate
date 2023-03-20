import { config } from "../../package.json";

export function registerPrompt() {
  let getSelection = () => {
    return ztoolkit.Reader.getSelectedText(
      Zotero.Reader.getByTabID(Zotero_Tabs.selectedID)
    );
  }
  ztoolkit.Prompt.register([{
    name: "Translate Sentences",
    label: config.addonInstance,
    when: () => {
      const selection = getSelection();
      const sl = Zotero.Prefs.get("ZoteroPDFTranslate.sourceLanguage") as string
      const tl = Zotero.Prefs.get("ZoteroPDFTranslate.targetLanguage") as string
      return selection.length > 0 && Zotero?.PDFTranslate && sl.startsWith("en") && tl.startsWith("zh")
    },
    callback: async (prompt) => {
      const selection = getSelection();
      const queue = Zotero.PDFTranslate.data.translate.queue
      let task = queue.find((task: any) => task.raw == selection && task.result.length > 0)
      task = null
      if (!task) {
        prompt.showTip("Loading...")
        task = await Zotero.PDFTranslate.api.translate(selection)
        Zotero.PDFTranslate.data.translate.queue.push(task)
        // @ts-ignore
        prompt.exit()
      }
      prompt.inputNode.placeholder = task.service
      const rawText = task.raw, resultText = task.result;
      let addSentences = (node: HTMLElement, text: string, dividers: string[]) => {
        let i = 0
        let sentences: string[] = []
        let sentence = ""
        // https://www.npmjs.com/package/sentence-extractor?activeTab=explore
        const abbrs = ["a.m.", "p.m.", "vol.", "inc.", "jr.", "dr.", "tex.", "co.", "prof.", "rev.", "revd.", "hon.", "v.s.", "i.e.", "ie.",
          "eg.", "e.g.", "al.", "st.", "ph.d.", "capt.", "mr.", "mrs.", "ms.", "fig."]
        let getWord = (i: number) => {
          let before, after;
          before = text.slice(0, i).match(/[\.a-zA-Z]+$/)
          after = text.slice(i + 1).match(/^[\.a-zA-Z]+/)
          let word = ([before, ["."], after].filter(i => i) as string[][])
            .map((i: string[]) => i[0]).join("")
          return word
        }
        let isAbbr = (i: number) => {
          const word = getWord(i).toLowerCase().replace(/\s+/g, " ")
          return abbrs.find((abbr: string) => {
            abbr = abbr.toLowerCase()
            return word == abbr
          })
        }
        let isPotentialAbbr = (i: number) => {
          const word = getWord(i)
          let parts = word.split(".").filter(i => i)
          return parts.length > 2 && parts.every(part => part.length <= 2)
        }
        while (i < text.length) {
          let char = text[i]
          sentence += char
          if (dividers.indexOf(char) != -1) {
            if (char == ".") {
              if (
                (i + 1 < text.length && text[i + 1] != " ") ||
                (
                  (isAbbr(i) || isPotentialAbbr(i))
                )
              ) {
                i += 1
                continue
              }
            }
            const blank = " "
            i += 1
            while (text[i] == blank) {
              sentence += blank
              i += 1
            }
            sentences.push(sentence)
            sentence = ""
            continue
          }
          i += 1
        }
        for (let i = 0; i < sentences.length; i++) {
          const span = ztoolkit.UI.appendElement(
            {
              tag: "span",
              id: `sentence-${i}`,
              properties: {
                innerText: sentences[i]
              },
              styles: {
                borderRadius: "3px"
              },
              listeners: [
                {
                  type: "mousemove",
                  listener: () => {
                    const highlightColor = "#fee972";

                    let twinNode = [...container.querySelectorAll(".text-container")]
                      .find(e => e != node) as HTMLDivElement;

                    node.querySelectorAll("span").forEach(e => e.style.backgroundColor = "")
                    span.style.backgroundColor = highlightColor
                    
                    twinNode?.querySelectorAll("span").forEach(e => e.style.backgroundColor = "");

                    const twinSpan = twinNode.querySelector(`span[id=sentence-${i}]`) as HTMLSpanElement

                    twinSpan.style.backgroundColor = highlightColor;

                    const twinNodeContainer = twinNode.parentNode as HTMLDivElement;
                    const nodeContainer = node.parentNode as HTMLDivElement;
                    if (direction == "column" && twinNode.classList.contains("result")) {
                      twinNodeContainer.scrollTo(0, twinSpan.offsetTop - twinNodeContainer.offsetHeight * .5 - nodeContainer.offsetHeight);
                    } else {
                      twinNodeContainer.scrollTo(0, twinSpan.offsetTop - twinNodeContainer.offsetHeight * .5);
                    }
                  }
                }
              ]
            },
            node
          )
        }
      }
      const container = prompt.createCommandsContainer() as HTMLDivElement
      // TODO: prefs: direction
      const directions = ["row", "column"]
      const direction = directions[1]
      container.setAttribute("style", `
        display: flex;
        flex-direction: ${direction};
        padding: .5em 1em;
        margin-left: 0px;
        width: 100%;
        height: 25em;
      `)
      const subContainers: HTMLDivElement[] = [];
      [
        ["raw", rawText, [".", "?", "!"]],
        ["result", resultText, ["?", "!", "！", "。", "？"]]
      ].forEach((args: any[]) => {        
        let [className, text, dividers] = args;
        const subContainer = ztoolkit.UI.createElement(document, "div", {
          styles: {
            padding: ".5em",
            border: "1px solid #eee",
            overflowY: "auto",
            minWidth: "10em",
            minHeight: "5em",
            height: "100%",
            width: "100%",
            textAlign: "justify",
          },
          children: [
            {
              tag: "div",
              classList: [className, "text-container"],
              styles: {
                fontSize: "1em",
                lineHeight: "1.5em",
                marginBottom: ".5em"
              },
            }
          ]
        });
        addSentences(subContainer.querySelector(".text-container")!, text, dividers);
        subContainers.push(subContainer);
      })

      const size = 5
      const resizer = ztoolkit.UI.createElement(document, "div", {
        styles: {
          height: (direction == "row" ? "100%" : `${size}px`),
          width: (direction == "column" ? "100%" : `${size}px`),
          backgroundColor: "#f0f0f0",
          cursor: direction == "column" ? "ns-resize" : "ew-resize",
        },
      })
      let y = 0, x = 0;
      let h = 0, w = 0;
      const rect = container.getBoundingClientRect();
      const H = rect.height;
      const W = rect.width;
      const mouseDownHandler = function (e: MouseEvent) {
        // hide
        subContainers.forEach(div => {
          div.querySelectorAll("span").forEach((e: HTMLSpanElement) => e.style.display = "none")
        })
        y = e.clientY;
        x = e.clientX;
        const rect = subContainers[1].getBoundingClientRect()
        h = rect.height;
        w = rect.width;
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
      };
      const mouseMoveHandler = function (e: MouseEvent) {
        const dy = e.clientY - y;
        const dx = e.clientX - x;
        if (direction == "column") {
          subContainers[1].style.height = `${h - dy}px`;
          subContainers[0].style.height = `${H - (h - dy) - size}px`;
        }
        if (direction == "row") {
          subContainers[1].style.width = `${w - dx}px`;
          subContainers[0].style.width = `${W - (w - dx) - size}px`;
        }
      };
      const mouseUpHandler = function () {
        // show
        subContainers.forEach(div => {
          div.querySelectorAll("span").forEach((e: HTMLSpanElement) => e.style.display = "")
        })
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
      };
      resizer.addEventListener('mousedown', mouseDownHandler);

      container.append(subContainers[0], resizer, subContainers[1])
    }
  }])
}
