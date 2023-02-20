import { config } from "../../package.json";

export function registerPrompt() {
  ztoolkit.Prompt.register([{
    name: "Translate Sentences",
    label: config.addonName,
    when: () => {
      const selection = ztoolkit.Reader.getSelectedText(
        Zotero.Reader.getByTabID(Zotero_Tabs.selectedID)
      );
      ztoolkit.log(selection)
      return selection.length > 0
    },
    callback: (prompt) => {
      const selection = ztoolkit.Reader.getSelectedText(
        Zotero.Reader.getByTabID(Zotero_Tabs.selectedID)
      );
      const container = prompt.createCommandsContainer() as HTMLDivElement
      container.style = `
          padding: .5em;
          display: flex;
          flex-direction: row;
          justify-content: space-between;
        `
      const queue = Zotero.PDFTranslate.data.translate.queue
      const task = queue.find((i: any) => i.raw == selection) || queue.slice(-1)[0]
      if (!task) {
        prompt.showTip("Task is Null.")
      }
      const rawText = task.raw, resultText = task.result;
      const props = {
        styles: {
          width: "49%",
          height: "20em",
          border: "1px solid #eee",
          textAlign: "justify",
          padding: ".5em",
          fontSize: "1em",
          lineHeight: "1.5em",
          overflowY: "auto",
        },
      }
      // TODO: prefs
      let addSentences = (node: HTMLElement, text: string, sep: string) => {
        let sentences = text.match(new RegExp(`.+?${sep}\\s*`, "g"))! as string[]
        let i = 0
        while (i < sentences.length - 1) {
          if (
            // Fig. 5
            /(table|fig|figure)\.\s*$/i.test(sentences[i]) ||
            // et al.,
            (/(et al)\.$/i.test(sentences[i]) && /^,/i.test(sentences[i + 1])) ||
            // 2.33
            (/\d\.$/i.test(sentences[i]) && /^\d/i.test(sentences[i + 1]))
          ) {
            console.log(sentences[i], "-", sentences[i + 1])
            sentences[i] = sentences[i] + sentences[i + 1]
            sentences.splice(i + 1, 1)
          } else {
            i += 1
          }
        }
        sentences = sentences.filter(s => s.length > 0)
        console.log(sentences)
        for (let i = 0; i < sentences.length; i++) {
          console.log(sentences[i])
          node.appendChild(ztoolkit.UI.createElement(document, "span", {
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
                listener: function () {
                  const hightlightColor = "#fee972"
                  // @ts-ignore
                  const span = this as HTMLSpanElement
                  const parentNode = span.parentNode as HTMLDivElement
                  parentNode?.querySelectorAll("span").forEach(e => e.style.backgroundColor = "")
                  span.style.backgroundColor = hightlightColor
                  const siblingNode = (parentNode?.previousSibling || parentNode?.nextSibling) as HTMLDivElement
                  siblingNode?.querySelectorAll("span").forEach(e => e.style.backgroundColor = "");
                  const twinSpan = siblingNode.querySelector(`span[id=sentence-${i}]`) as HTMLSpanElement
                  twinSpan.style.backgroundColor = hightlightColor;
                  siblingNode.scrollTo(0, twinSpan.offsetTop - siblingNode.offsetHeight * .5);
                }
              }
            ]
          }))
        }
      }
      const rawDiv = ztoolkit.UI.createElement(document, "div", {
        ...props
      })
      addSentences(rawDiv, rawText, "[\\.;]")
      const resultDiv = ztoolkit.UI.createElement(document, "div", {
        ...props,
      })
      addSentences(resultDiv, resultText, "[。;；]")
      container.append(rawDiv, resultDiv)
    }
  }])
}
