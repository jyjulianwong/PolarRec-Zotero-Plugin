import { MainViewController } from "./mainViewController";
import { getString } from "./locale";

export class MainViewFactory {
  static #MAX_RESULT_COUNT = 50;
  static #LOADING_VIEW_ELEM_ID = "polarrec-reco-loading-view";
  static #RESULT_VIEW_ELEM_ID_STEM = "polarrec-reco-result-view-";
  static #RESULT_TITLE_ELEM_ID_STEM = "polarrec-reco-result-title-";
  static #RESULT_AUTHORS_ELEM_ID_STEM = "polarrec-reco-result-authors-";
  static #RESULT_YEAR_ELEM_ID_STEM = "polarrec-reco-result-year-";
  static #RESULT_URL_ELEM_ID_STEM = "polarrec-reco-result-url-";

  /**
   * @param elemId - The HTML element ID used to identify this element.
   * @param text - The value, or inner text, to be displayed.
   * @param bold - Whether the inner text should be bolded or not.
   * @returns The HTML element for a result field component in JSON.
   * @private
   */
  static #getResultFieldElem(elemId: string, text: string, bold = false) {
    return {
      tag: "input",
      id: elemId,
      styles: {
        "width": "100%",
        "border": "none",
        "font-weight": bold ? "bold" : "normal",
      },
      attributes: {
        "readonly": "true",
        "value": text,
      },
    }
  }

  /**
   * Registers the Main View as a library tab panel.
   *
   * @returns The Tab ID of the View, used for the unregister process.
   */
  static register() {
    const mainViewElems = [
      {
        tag: "h2",
        properties: {
          innerText: getString("polarrec.name"),
        },
      },
      {
        tag: "div",
        properties: {
          innerText: getString("polarrec.reco.inst"),
        },
      },
      {
        tag: "button",
        namespace: "html",
        styles: {
          "margin": "10px 0px 20px 0px"
        },
        properties: {
          innerText: getString("polarrec.reco.button"),
        },
        listeners: [
          {
            type: "click",
            listener: () => {
              const resultViewElemIds = [...Array(this.#MAX_RESULT_COUNT).keys()]
                .map(i => this.#RESULT_VIEW_ELEM_ID_STEM + i.toString());
              const resultTitleElemIds = [...Array(this.#MAX_RESULT_COUNT).keys()]
                .map(i => this.#RESULT_TITLE_ELEM_ID_STEM + i.toString());
              const resultAuthorsElemIds = [...Array(this.#MAX_RESULT_COUNT).keys()]
                .map(i => this.#RESULT_AUTHORS_ELEM_ID_STEM + i.toString());
              const resultYearElemIds = [...Array(this.#MAX_RESULT_COUNT).keys()]
                .map(i => this.#RESULT_YEAR_ELEM_ID_STEM + i.toString());
              const resultUrlElemIds = [...Array(this.#MAX_RESULT_COUNT).keys()]
                .map(i => this.#RESULT_URL_ELEM_ID_STEM + i.toString());
              MainViewController.onRecoButtonClicked(
                this.#LOADING_VIEW_ELEM_ID,
                resultViewElemIds,
                resultTitleElemIds,
                resultAuthorsElemIds,
                resultYearElemIds,
                resultUrlElemIds
              );
            },
          },
        ],
      },
      {
        tag: "div",
        id: this.#LOADING_VIEW_ELEM_ID,
        styles: {
          "display": "none"
        },
        properties: {
          innerText: getString("polarrec.reco.load"),
        },
      },
    ]

    for (let i = 0; i < this.#MAX_RESULT_COUNT; i++) {
      mainViewElems.push({
        tag: "div",
        id: this.#RESULT_VIEW_ELEM_ID_STEM + i.toString(),
        styles: {
          "display": "none"
        },
        // @ts-ignore
        children: [
          {
            tag: "hr",
            namespace: "html",
          },
          this.#getResultFieldElem(
            this.#RESULT_TITLE_ELEM_ID_STEM + i.toString(),
            "Related Resource " + i.toString(),
            true,
          ),
          this.#getResultFieldElem(
            this.#RESULT_AUTHORS_ELEM_ID_STEM + i.toString(),
            "No Authors",
          ),
          this.#getResultFieldElem(
            this.#RESULT_YEAR_ELEM_ID_STEM + i.toString(),
            "No Year",
          ),
          this.#getResultFieldElem(
            this.#RESULT_URL_ELEM_ID_STEM + i.toString(),
            "No URL",
          ),
        ]
      })
    }

    return ztoolkit.LibraryTabPanel.register(
      getString("polarrec.name"),
      (panel: XUL.Element, win: Window) => {
        // @ts-ignore
        const mainView = ztoolkit.UI.createElement(win.document, "vbox", {
          styles: {
            "padding": "0px 10px 10px 10px",
            "word-wrap": "break-word",
          },
          attributes: {
            "flex": "1",
          },
          children: mainViewElems,
        });
        panel.append(mainView);
      },
      {
        targetIndex: -1,
      }
    );
  }
}