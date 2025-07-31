import { cnkiStatusCallback } from "./cnki";
import { getLLMStatusCallback } from "./gpt";
import { geminiStatusCallback } from "./gemini";
import { niutransStatusCallback } from "./niutrans";
import { deeplxStatusCallback } from "./deeplx";
import { qwenmtStatusCallback } from "./qwenmt";
import { claudeStatusCallback } from "./claude";
import { aliyunStatusCallback } from "./aliyun";
import { libretranslateStatusCallback } from "./libretranslate";
import { tencentStatusCallback } from "./tencent";
import { mtranserverStatusCallback } from "./mtranserver";
import { potStatusCallback } from "./pot";
import { deeplcustomStatusCallback } from "./deeplcustom";
import { xftransStatusCallback } from "./xftrans";
import { youdaozhiyunStatusCallback } from "./youdaozhiyun";
import { youdaozhiyunllmStatusCallback } from "./youdaozhiyunllm";

export const secretStatusButtonData: {
  [key: string]: {
    labels: { [_k in "pass" | "fail"]: string };
    callback(status: boolean): void;
  };
} = {
  libretranslate: {
    labels: {
      pass: "service-libretranslate-secret-pass",
      fail: "service-libretranslate-secret-fail",
    },
    callback: libretranslateStatusCallback,
  },
  niutranspro: {
    labels: {
      pass: "service-niutranspro-secret-pass",
      fail: "service-niutranspro-secret-fail",
    },
    callback: niutransStatusCallback,
  },
  deeplcustom: {
    labels: {
      pass: "service-deeplcustom-secret-pass",
      fail: "service-deeplcustom-secret-fail",
    },
    callback: deeplcustomStatusCallback,
  },
  deeplx: {
    labels: {
      pass: "service-deeplx-secret-pass",
      fail: "service-deeplx-secret-fail",
    },
    callback: deeplxStatusCallback,
  },
  chatgpt: {
    labels: {
      pass: "service-chatgpt-secret-pass",
      fail: "service-chatgpt-secret-fail",
    },
    callback: getLLMStatusCallback("chatGPT"),
  },
  customgpt1: {
    labels: {
      pass: "service-chatgpt-secret-pass",
      fail: "service-chatgpt-secret-fail",
    },
    callback: getLLMStatusCallback("customGPT1"),
  },
  customgpt2: {
    labels: {
      pass: "service-chatgpt-secret-pass",
      fail: "service-chatgpt-secret-fail",
    },
    callback: getLLMStatusCallback("customGPT2"),
  },
  customgpt3: {
    labels: {
      pass: "service-chatgpt-secret-pass",
      fail: "service-chatgpt-secret-fail",
    },
    callback: getLLMStatusCallback("customGPT3"),
  },
  azuregpt: {
    labels: {
      pass: "service-azuregpt-secret-pass",
      fail: "service-azuregpt-secret-fail",
    },
    callback: getLLMStatusCallback("azureGPT"),
  },
  gemini: {
    labels: {
      pass: "service-gemini-secret-pass",
      fail: "service-gemini-secret-fail",
    },
    callback: geminiStatusCallback,
  },
  xftrans: {
    labels: {
      pass: "service-xftrans-secret-pass",
      fail: "service-xftrans-secret-fail",
    },
    callback: xftransStatusCallback,
  },
  cnki: {
    labels: {
      pass: "service-cnki-settings",
      fail: "service-cnki-settings",
    },
    callback: cnkiStatusCallback,
  },
  qwenmt: {
    labels: {
      pass: "service-qwenmt-secret-pass",
      fail: "service-qwenmt-secret-fail",
    },
    callback: qwenmtStatusCallback,
  },
  claude: {
    labels: {
      pass: "service-claude-secret-pass",
      fail: "service-claude-secret-fail",
    },
    callback: claudeStatusCallback,
  },
  aliyun: {
    labels: {
      pass: "service-aliyun-secret-pass",
      fail: "service-aliyun-secret-fail",
    },
    callback: aliyunStatusCallback,
  },
  tencent: {
    labels: {
      pass: "service-tencent-secret-pass",
      fail: "service-tencent-secret-fail",
    },
    callback: tencentStatusCallback,
  },
  youdaozhiyun: {
    labels: {
      pass: "service-youdaozhiyun-secret-pass",
      fail: "service-youdaozhiyun-secret-fail",
    },
    callback: youdaozhiyunStatusCallback,
  },
    youdaozhiyunllm: {
    labels: {
      pass: "service-youdaozhiyunllm-secret-pass",
      fail: "service-youdaozhiyunllm-secret-fail",
    },
    callback: youdaozhiyunllmStatusCallback,
  },
  mtranserver: {
    labels: {
      pass: "service-mtranserver-secret-pass",
      fail: "service-mtranserver-secret-fail",
    },
    callback: mtranserverStatusCallback,
  },
  pot: {
    labels: {
      pass: "service-pot-secret-pass",
      fail: "service-pot-secret-fail",
    },
    callback: potStatusCallback,
  },
};
