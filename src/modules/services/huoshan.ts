import { TranslateTaskProcessor } from "../../utils/task";
import VolcEngineSDK from "volcengine-sdk";
const { ApiInfo, ServiceInfo, Credentials, API, Request } = VolcEngineSDK;

export default <TranslateTaskProcessor>async function (data) {
  const params = data.secret.split("#");
  const id: string = params[0];
  const key: string = params[1];

  const AK = id;
  const SK = key;

  const toLang = "zh";
  const textList = [data.raw];

  const credentials = new Credentials(AK, SK, "translate", "cn-north-1");

  const header = new Request.Header({
    "Content-Type": "application/json",
  });
  const query = new Request.Query({
    Action: "TranslateText",
    Version: "2020-06-01",
  });
  const body = new Request.Body({
    TargetLanguage: toLang,
    TextList: textList,
  });

  const serviceInfo = new ServiceInfo(
    "open.volcengineapi.com",
    header,
    credentials,
  );
  const apiInfo = new ApiInfo("POST", "/", query, body);

  const api = API(serviceInfo, apiInfo);

  let tgt = "翻译失败";

  const xhr = await Zotero.HTTP.request(
    "POST",
    "http://translate.volcengineapi.com/?Action=TranslateText&Version=2020-06-01",
    {
      headers: api.config.headers,
      body: JSON.stringify({
        TargetLanguage: "zh",
        TextList: [data.raw],
      }),
    },
  );
  if (xhr?.status !== 200) {
    throw `Request error: ${xhr?.status}`;
  }

  const { TranslationList } = JSON.parse(xhr.response);

  data.result = TranslationList[0].Translation;
};
