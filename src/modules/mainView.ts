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
  citation_count_ranking: string;
  keyword_based_ranking: string;
}

/**
 * The methods a controller for the main view needs to implement.
 * These methods correspond to the callback events that are triggered by
 * controls and buttons across the user interface of the main view.
 */
interface MainViewControllable {
  onRecoArxivRsDbClicked(checked: boolean): void;
  onRecoIeeeXploreRsDbClicked(checked: boolean): void;
  onRecoAuthorsFilterClicked(checked: boolean): void;
  onRecoConfNameFilterClicked(checked: boolean): void;
  onRecoItemButtonClicked(): void;
  onRecoItemsInViewButtonClicked(): void;
}

class MainView {
  // The maximum number of results to be displayed for each result section.
  #MAX_RESULT_COUNT = 50;
  // The display names of each result section.
  #RESULTS_SECTION_NAMES = [
    getString("polarrec.reco.resultlist.existing"),
    getString("polarrec.reco.resultlist.database"),
  ];
  // The HTML element IDs for various elements across the main view.
  #RECO_ARXIV_RS_DB_ELEM_ID = "polarrec-reco-arxiv-rs-db";
  #RECO_IEEE_XPLORE_RS_DB_ELEM_ID = "polarrec-reco-ieee-xplore-rs-db";
  #RECO_AUTHORS_FILTER_ELEM_ID = "polarrec-reco-authors-filter";
  #RECO_CONF_NAME_FILTER_ELEM_ID = "polarrec-reco-conf-name-filter";
  #RECO_ITEM_BUTTON_ELEM_ID = "polarrec-reco-item-button";
  #RECO_ITEMS_IN_VIEW_BUTTON_ELEM_ID = "polarrec-reco-items-in-view-button";
  #LOADING_VIEW_ELEM_ID = "polarrec-reco-loading-view";
  #RESULTS_SECTION_ELEM_IDS = [
    "polarrec-reco-result-section-existing",
    "polarrec-reco-result-section-database",
  ];
  #RESULT_VIEW_ELEM_ID_STEM = "polarrec-reco-result-view-";
  #RESULT_TITLE_ELEM_ID_STEM = "polarrec-reco-result-title-";
  #RESULT_AUTHORS_ELEM_ID_STEM = "polarrec-reco-result-authors-";
  #RESULT_YEAR_ELEM_ID_STEM = "polarrec-reco-result-year-";
  #RESULT_URL_ELEM_ID_STEM = "polarrec-reco-result-url-";
  #RESULT_AUTHOR_RANK_ELEM_ID_STEM = "polarrec-reco-result-author-rank-";
  #RESULT_CITATION_RANK_ELEM_ID_STEM = "polarrec-reco-result-citation-rank-";
  #RESULT_CITCOUNT_RANK_ELEM_ID_STEM = "polarrec-reco-result-citcount-rank-";
  #RESULT_KEYWORD_RANK_ELEM_ID_STEM = "polarrec-reco-result-keyword-rank-";
  #RESULT_URL_BUTTON_ELEM_ID_STEM = "polarrec-reco-result-url-button-";

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
   * Builds all the elements contained in the main view in the process.
   *
   * @returns The panel tab ID of the view, used for the unregister process.
   */
  register() {
    // Initialise the view with the name, instruction, and button elements.
    const mainViewElems = [
      // The display name of the Zotero plugin.
      {
        tag: "h2",
        properties: {
          innerText: getString("polarrec.name"),
        },
      },
      // Instructions related to the usage of the plugin.
      {
        tag: "div",
        styles: {
          "margin": "0px 0px 10px 0px",
        },
        properties: {
          innerText: getString("polarrec.reco.inst"),
        },
      },
      // Database-related filter controls.
      {
        tag: "h3",
        properties: {
          innerText: getString("polarrec.reco.rsdb.inst"),
        },
      },
      this.#getRecoFilterElem(
        this.#RECO_ARXIV_RS_DB_ELEM_ID,
        "ArXiv",
      ),
      this.#getRecoFilterElem(
        this.#RECO_IEEE_XPLORE_RS_DB_ELEM_ID,
        "IEEE Xplore",
      ),
      // Result-related filter controls.
      {
        tag: "h3",
        properties: {
          innerText: getString("polarrec.reco.filter.inst"),
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
      // Buttons to trigger the recommendation process.
      {
        tag: "button",
        id: this.#RECO_ITEM_BUTTON_ELEM_ID,
        namespace: "html",
        styles: {
          "margin": "10px 0px 0px 0px"
        },
        properties: {
          innerText: getString("polarrec.reco.item.button"),
        },
      },
      {
        tag: "button",
        id: this.#RECO_ITEMS_IN_VIEW_BUTTON_ELEM_ID,
        namespace: "html",
        styles: {
          "margin": "5px 0px 20px 0px"
        },
        properties: {
          innerText: getString("polarrec.reco.collection.button"),
        },
      },
      // The status view that displays the loading status of the system.
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

    // Add multiple lists (sections) of results to the view.
    for (let l = 0; l < this.#RESULTS_SECTION_NAMES.length; l++) {
      // Add the display name of this list to the view.
      // @ts-ignore
      mainViewElems.push({
        tag: "h3",
        id: this.#RESULTS_SECTION_ELEM_IDS[l],
        styles: {
          "display": "none",
          // @ts-ignore
          "width": "100%",
          "background-color": "lavender",
        },
        properties: {
          innerText: this.#RESULTS_SECTION_NAMES[l],
        },
      });

      // Add the result elements for this list to the view.
      for (let i = 0; i < this.#MAX_RESULT_COUNT; i++) {
        mainViewElems.push({
          tag: "div",
          id: this.#RESULT_VIEW_ELEM_ID_STEM + l.toString() + i.toString(),
          styles: {
            "display": "none"
          },
          // Add the various data fields included in each result to the view.
          // @ts-ignore
          children: [
            {
              tag: "hr",
              namespace: "html",
            },
            this.#getResultFieldElem(
              this.#RESULT_TITLE_ELEM_ID_STEM + l.toString() + i.toString(),
              "Related Resource " + i.toString(),
              true,
            ),
            this.#getResultFieldElem(
              this.#RESULT_AUTHORS_ELEM_ID_STEM + l.toString() + i.toString(),
              "No Authors",
            ),
            this.#getResultFieldElem(
              this.#RESULT_YEAR_ELEM_ID_STEM + l.toString() + i.toString(),
              "No Year",
            ),
            this.#getResultFieldElem(
              this.#RESULT_URL_ELEM_ID_STEM + l.toString() + i.toString(),
              "No URL",
            ),
            this.#getResultFieldElem(
              this.#RESULT_AUTHOR_RANK_ELEM_ID_STEM + l.toString() + i.toString(),
              "No Author-Based Ranking",
              false,
              true
            ),
            this.#getResultFieldElem(
              this.#RESULT_CITATION_RANK_ELEM_ID_STEM + l.toString() + i.toString(),
              "No Citation-Based Ranking",
              false,
              true
            ),
            this.#getResultFieldElem(
              this.#RESULT_CITCOUNT_RANK_ELEM_ID_STEM + l.toString() + i.toString(),
              "No Citation Count Ranking",
              false,
              true
            ),
            this.#getResultFieldElem(
              this.#RESULT_KEYWORD_RANK_ELEM_ID_STEM + l.toString() + i.toString(),
              "No Keyword-Based Ranking",
              false,
              true
            ),
            {
              tag: "button",
              id: this.#RESULT_URL_BUTTON_ELEM_ID_STEM + l.toString() + i.toString(),
              namespace: "html",
              styles: {
                "width": "100%",
                "margin": "5px 0px 0px 0px",
              },
              properties: {
                innerText: getString("polarrec.reco.result.viewonline"),
              },
            },
          ]
        })
      }
    }

    // Register the view to the Zotero UI and return the panel tab ID.
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

  /**
   * Updates the loading status in the status view.
   *
   * @param isLoading - Whether the system is currently loading or not.
   * @param customText - An optional custom message the status view should
   * display.
   */
  updateLoadingView(isLoading: boolean, customText?: string) {
    const loadElem = document.getElementById(this.#LOADING_VIEW_ELEM_ID);
    if (loadElem === null)
      return;

    if (customText !== undefined) {
      // Replace the default text with custom text.
      loadElem.innerText = customText;
      // Show the element.
      loadElem.style.display = "block";
      return;
    }

    // Set the text to the default loading text.
    loadElem.innerText = getString("polarrec.reco.load");
    // Show the element if loading. Otherwise, hide the element.
    loadElem.style.display = isLoading ? "block" : "none";
  }

  /**
   * Clears or populates the results view.
   *
   * @param results - A 2D array, with the list of results for each result
   * section.
   */
  updateResultViews(results: Result[][]) {
    if (results.length === 0)
      // Create an empty array for each result list.
      // This is to prevent out-of-range array accesses in the steps below.
      results = Array(this.#RESULTS_SECTION_NAMES.length).fill([]);

    for (let l = 0; l < this.#RESULTS_SECTION_NAMES.length; l++) {
      const sectionElem = document.getElementById(this.#RESULTS_SECTION_ELEM_IDS[l]);
      if (sectionElem === null)
        continue;
      // Hide the entire section view if there are no results for that section.
      sectionElem.style.display = results[l].length === 0 ? "none" : "block";

      // Show all the result data in their respective result elements.
      for (let i = 0; i < results[l].length; i++) {
        const viewElem = document.getElementById(this.#RESULT_VIEW_ELEM_ID_STEM + l.toString() + i.toString());
        const titleElem = document.getElementById(this.#RESULT_TITLE_ELEM_ID_STEM + l.toString() + i.toString());
        const authorsElem = document.getElementById(this.#RESULT_AUTHORS_ELEM_ID_STEM + l.toString() + i.toString());
        const yearElem = document.getElementById(this.#RESULT_YEAR_ELEM_ID_STEM + l.toString() + i.toString());
        const urlElem = document.getElementById(this.#RESULT_URL_ELEM_ID_STEM + l.toString() + i.toString());
        const authorRankElem = document.getElementById(this.#RESULT_AUTHOR_RANK_ELEM_ID_STEM + l.toString() + i.toString());
        const citationRankElem = document.getElementById(this.#RESULT_CITATION_RANK_ELEM_ID_STEM + l.toString() + i.toString());
        const citCountRankElem = document.getElementById(this.#RESULT_CITCOUNT_RANK_ELEM_ID_STEM + l.toString() + i.toString());
        const keywordRankElem = document.getElementById(this.#RESULT_KEYWORD_RANK_ELEM_ID_STEM + l.toString() + i.toString());
        if (
          viewElem === null ||
          titleElem === null ||
          authorsElem === null ||
          yearElem === null ||
          urlElem === null ||
          authorRankElem === null ||
          citationRankElem === null ||
          citCountRankElem === null ||
          keywordRankElem === null
        )
          continue;

        titleElem.setAttribute("value", results[l][i].title);

        if (results[l][i].authors !== undefined)
          authorsElem.setAttribute(
            "value",
            results[l][i].authors
              .reduce((text: string, author: string) => text + ", " + author)
          );
        else
          authorsElem.setAttribute("value", results[l][i].year);

        if (results[l][i].year !== undefined)
          yearElem.setAttribute("value", results[l][i].year);
        else
          yearElem.setAttribute("value", "No Year");

        if (results[l][i].url !== undefined)
          urlElem.setAttribute("value", results[l][i].url);
        else
          urlElem.setAttribute("value", "No URL");

        authorRankElem.setAttribute("value", `Author-based ranking:\t${results[l][i].author_based_ranking}`);
        citationRankElem.setAttribute("value", `Citation-based ranking:\t${results[l][i].citation_based_ranking}`);
        citCountRankElem.setAttribute("value", `Citation count ranking:\t${results[l][i].citation_count_ranking}`);
        keywordRankElem.setAttribute("value", `Keyword-based ranking:\t${results[l][i].keyword_based_ranking}`);

        viewElem.style.display = "block";
      }

      // Hide the remaining unused result elements.
      for (let i = results[l].length; i < this.#MAX_RESULT_COUNT; i++) {
        const viewElem = document.getElementById(this.#RESULT_VIEW_ELEM_ID_STEM + l.toString() + i.toString());
        if (viewElem !== null)
          viewElem.style.display = "none";
      }
    }
  }

  /**
   * This must be called after this view has been registered.
   *
   * @param controller: The controller to this view.
   */
  addRecoArxivRsDbListener(controller: MainViewControllable) {
    const recoFilter = document.getElementById(this.#RECO_ARXIV_RS_DB_ELEM_ID);
    if (recoFilter === null)
      return;

    recoFilter.addEventListener("change", event => {
      const filter = event.currentTarget as HTMLInputElement;
      controller.onRecoArxivRsDbClicked(filter === null ? false : filter.checked);
    });
  }

  /**
   * This must be called after this view has been registered.
   *
   * @param controller: The controller to this view.
   */
  addRecoIeeeXploreRsDbListener(controller: MainViewControllable) {
    const recoFilter = document.getElementById(this.#RECO_IEEE_XPLORE_RS_DB_ELEM_ID);
    if (recoFilter === null)
      return;

    recoFilter.addEventListener("change", event => {
      const filter = event.currentTarget as HTMLInputElement;
      controller.onRecoIeeeXploreRsDbClicked(filter === null ? false : filter.checked);
    });
  }

  /**
   * This must be called after this view has been registered.
   *
   * @param controller: The controller to this view.
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
   * @param controller: The controller to this view.
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
   * @param controller: The controller to this view.
   */
  addRecoItemButtonListener(controller: MainViewControllable) {
    const recoButton = document.getElementById(this.#RECO_ITEM_BUTTON_ELEM_ID);
    if (recoButton === null)
      return;

    recoButton.addEventListener("click", _ => controller.onRecoItemButtonClicked());
  }

  /**
   * This must be called after this view has been registered.
   *
   * @param controller: The controller to this view.
   */
  addRecoItemsInViewButtonListener(controller: MainViewControllable) {
    const recoButton = document.getElementById(this.#RECO_ITEMS_IN_VIEW_BUTTON_ELEM_ID);
    if (recoButton === null)
      return;

    recoButton.addEventListener("click", _ => controller.onRecoItemsInViewButtonClicked());
  }

  /**
   * This must be called after this view has been registered.
   *
   * @param controller: The controller to this view.
   */
  addResultUrlButtonListener(controller: MainViewControllable) {
    for (let l = 0; l < this.#RESULTS_SECTION_NAMES.length; l++) {
      for (let i = 0; i < this.#MAX_RESULT_COUNT; i++) {
        const urlButtomElem = document.getElementById(this.#RESULT_URL_BUTTON_ELEM_ID_STEM + l.toString() + i.toString());
        if (urlButtomElem === null)
          continue;

        urlButtomElem.addEventListener("click", _ => {
          const urlElem = document.getElementById(this.#RESULT_URL_ELEM_ID_STEM + l.toString() + i.toString());
          if (urlElem === null)
            return;

          const urlString = urlElem.getAttribute("value");
          if (urlString === null || urlString === "No URL")
            return;

          Zotero.getActiveZoteroPane().loadURI(urlString);
        });
      }
    }
  }
}

export { MainViewControllable, MainView };