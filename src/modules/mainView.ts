import { getString } from "./locale";

/**
 * The fields that are included in a recommendation result entry.
 * Not all available fields are displayed -- only the necessary ones.
 */
interface Result {
  title: string;
  authors: string[];
  year: string;
  url: string;
  author_based_ranking: string;
  citation_based_ranking: string;
  keyword_based_ranking: string;
}

/**
 * The methods a controller for the main view needs to implement.
 */
interface MainViewControllable {
  onRecoAuthorsFilterClicked(checked: boolean): void;
  onRecoConfNameFilterClicked(checked: boolean): void;
  onRecoButtonClicked(): void;
}

class MainView {
  #MAX_RESULT_COUNT = 50;
  #RECO_AUTHORS_FILTER_ELEM_ID = "polarrec-reco-authors-filter";
  #RECO_CONF_NAME_FILTER_ELEM_ID = "polarrec-reco-conf-name-filter";
  #RECO_BUTTON_ELEM_ID = "polarrec-reco-button";
  #LOADING_VIEW_ELEM_ID = "polarrec-reco-loading-view";
  #RESULT_VIEW_ELEM_ID_STEM = "polarrec-reco-result-view-";
  #RESULT_TITLE_ELEM_ID_STEM = "polarrec-reco-result-title-";
  #RESULT_AUTHORS_ELEM_ID_STEM = "polarrec-reco-result-authors-";
  #RESULT_YEAR_ELEM_ID_STEM = "polarrec-reco-result-year-";
  #RESULT_URL_ELEM_ID_STEM = "polarrec-reco-result-url-";
  #RESULT_AUTHOR_RANK_ELEM_ID_STEM = "polarrec-reco-result-author-rank-";
  #RESULT_CITATION_RANK_ELEM_ID_STEM = "polarrec-reco-result-citation-rank-";
  #RESULT_KEYWORD_RANK_ELEM_ID_STEM = "polarrec-reco-result-keyword-rank-";

  /**
   * Builds a checkbox-style recommendation filter element.
   *
   * @param elemId - The HTML element ID used to identify this element.
   * @param text - The value, or inner text, to be displayed.
   * @returns The HTML element for a recommendation filter component in JSON.
   * @private
   */
  #getRecoFilterElem(elemId: string, text: string) {
    return {
      tag: "div",
      children: [
        {
          tag: "input",
          id: elemId,
          attributes: {
            "type": "checkbox",
            "name": elemId,
          },
        },
        {
          tag: "label",
          attributes: {
            "for": elemId,
          },
          properties: {
            innerText: text,
          },
        },
      ],
    };
  }

  /**
   * Builds a field child element that belongs in a result element.
   *
   * @param elemId - The HTML element ID used to identify this element.
   * @param text - The value, or inner text, to be displayed.
   * @param bold - Whether the inner text should be bolded or not.
   * @param grey - Whether the inner text should be greyed or not.
   * @returns The HTML element for a result field component in JSON.
   * @private
   */
  #getResultFieldElem(elemId: string, text: string, bold = false, grey = false) {
    return {
      tag: "input",
      id: elemId,
      styles: {
        "width": "100%",
        "border": "none",
        "font-weight": bold ? "bold" : "normal",
        "color": grey ? "grey" : "black",
      },
      attributes: {
        "readonly": "true",
        "value": text,
      },
    };
  }

  constructor() {}

  /**
   * Registers the main view as a library tab panel.
   *
   * @returns The panel tab ID of the view, used for the unregister process.
   */
  register() {
    // Initialise the View with the name, instruction, and button elements.
    const mainViewElems = [
      {
        tag: "h2",
        properties: {
          innerText: getString("polarrec.name"),
        },
      },
      {
        tag: "div",
        styles: {
          "margin": "0px 0px 10px 0px",
        },
        properties: {
          innerText: getString("polarrec.reco.inst"),
        },
      },
      this.#getRecoFilterElem(
        this.#RECO_AUTHORS_FILTER_ELEM_ID,
        getString("polarrec.reco.filter.authors"),
      ),
      this.#getRecoFilterElem(
        this.#RECO_CONF_NAME_FILTER_ELEM_ID,
        getString("polarrec.reco.filter.confname"),
      ),
      {
        tag: "button",
        id: this.#RECO_BUTTON_ELEM_ID,
        namespace: "html",
        styles: {
          "margin": "10px 0px 20px 0px"
        },
        properties: {
          innerText: getString("polarrec.reco.button"),
        },
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

    // Add the result elements to the View.
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
          this.#getResultFieldElem(
            this.#RESULT_AUTHOR_RANK_ELEM_ID_STEM + i.toString(),
            "No Author-Based Ranking",
            false,
            true
          ),
          this.#getResultFieldElem(
            this.#RESULT_CITATION_RANK_ELEM_ID_STEM + i.toString(),
            "No Citation-Based Ranking",
            false,
            true
          ),
          this.#getResultFieldElem(
            this.#RESULT_KEYWORD_RANK_ELEM_ID_STEM + i.toString(),
            "No Keyword-Based Ranking",
            false,
            true
          ),
        ]
      })
    }

    // Register the View to the Zotero UI and return the panel tab ID.
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

  updateLoadingView(isLoading: boolean, customText?: string) {
    const loadElem = document.getElementById(this.#LOADING_VIEW_ELEM_ID);
    if (loadElem === null)
      return;

    if (customText !== undefined) {
      loadElem.innerText = customText;
      loadElem.style.display = "block";
      return;
    }

    loadElem.innerText = getString("polarrec.reco.load");
    loadElem.style.display = isLoading ? "block" : "none";
  }

  updateResultViews(results: Result[]) {
    for (let i = 0; i < results.length; i++) {
      const viewElem = document.getElementById(this.#RESULT_VIEW_ELEM_ID_STEM + i.toString());
      const titleElem = document.getElementById(this.#RESULT_TITLE_ELEM_ID_STEM + i.toString());
      const authorsElem = document.getElementById(this.#RESULT_AUTHORS_ELEM_ID_STEM + i.toString());
      const yearElem = document.getElementById(this.#RESULT_YEAR_ELEM_ID_STEM + i.toString());
      const urlElem = document.getElementById(this.#RESULT_URL_ELEM_ID_STEM + i.toString());
      const authorRankElem = document.getElementById(this.#RESULT_AUTHOR_RANK_ELEM_ID_STEM + i.toString());
      const citationRankElem = document.getElementById(this.#RESULT_CITATION_RANK_ELEM_ID_STEM + i.toString());
      const keywordRankElem = document.getElementById(this.#RESULT_KEYWORD_RANK_ELEM_ID_STEM + i.toString());
      if (
        viewElem === null ||
        titleElem === null ||
        authorsElem === null ||
        yearElem === null ||
        urlElem === null ||
        authorRankElem === null ||
        citationRankElem === null ||
        keywordRankElem === null
      )
        continue;

      titleElem.setAttribute("value", results[i].title);
      authorsElem.setAttribute(
        "value",
        results[i].authors
          .reduce((text: string, author: string) => text + ", " + author)
      );
      yearElem.setAttribute("value", results[i].year);
      urlElem.setAttribute("value", results[i].url);
      authorRankElem.setAttribute("value", `Author-based ranking:\t${results[i].author_based_ranking}`);
      citationRankElem.setAttribute("value", `Citation-based ranking:\t${results[i].citation_based_ranking}`);
      keywordRankElem.setAttribute("value", `Keyword-based ranking:\t${results[i].keyword_based_ranking}`);

      viewElem.style.display = "block";
    }

    // Hide the remaining unused result elements.
    for (let i = results.length; i < this.#MAX_RESULT_COUNT; i++) {
      const viewElem = document.getElementById(this.#RESULT_VIEW_ELEM_ID_STEM + i.toString());
      if (viewElem !== null)
        viewElem.style.display = "none";
    }
  }

  /**
   * This must be called after this view has been registered.
   *
   * @param controller: The controller to this View.
   */
  addRecoAuthorsFilterListener(controller: MainViewControllable) {
    const recoFilter = document.getElementById(this.#RECO_AUTHORS_FILTER_ELEM_ID);
    if (recoFilter === null)
      return;

    recoFilter.addEventListener("change", event => {
      const filter = event.currentTarget as HTMLInputElement;
      controller.onRecoAuthorsFilterClicked(filter === null ? false : filter.checked);
    });
  }

  /**
   * This must be called after this view has been registered.
   *
   * @param controller: The controller to this View.
   */
  addRecoConfNameFilterListener(controller: MainViewControllable) {
    const recoFilter = document.getElementById(this.#RECO_CONF_NAME_FILTER_ELEM_ID);
    if (recoFilter === null)
      return;

    recoFilter.addEventListener("change", event => {
      const filter = event.currentTarget as HTMLInputElement;
      controller.onRecoConfNameFilterClicked(filter === null ? false : filter.checked);
    });
  }

  /**
   * This must be called after this view has been registered.
   *
   * @param controller: The controller to this View.
   */
  addRecoButtonListener(controller: MainViewControllable) {
    const recoButton = document.getElementById(this.#RECO_BUTTON_ELEM_ID);
    if (recoButton === null)
      return;

    recoButton.addEventListener("click", _ => controller.onRecoButtonClicked());
  }
}

export { MainViewControllable, MainView };