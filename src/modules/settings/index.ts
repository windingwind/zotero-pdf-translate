import { chatGPTStatusCallback } from "./gpt";

export const secretStatusButtonData: {
  [key: string]: {
    labels: { [_k in "pass" | "fail"]: string };
    callback(status: boolean): void;
  };
} = {
  chatgpt: {
    labels: {
      pass: "service-chatgpt-secret-pass",
      fail: "service-chatgpt-secret-fail",
    },
    callback: chatGPTStatusCallback,
  },
};
