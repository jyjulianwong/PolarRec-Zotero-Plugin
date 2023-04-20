import { getString } from "./locale";

export class MainViewController {
  static #getApiUrlBase(): string {
    /**
     * @returns The PolarRec API's base URL depending on if the plugin was built
     * in development mode.
     * @private
     */
    return __env__ === "development" ?
      // If in development mode, use locally-deployed Flask server instead.
      "http://127.0.0.1:5000" :
      // Otherwise, use latest stable release of PolarRec API.
      "http://polarrec-env.eba-nzautmta.eu-west-2.elasticbeanstalk.com";
  }

  /**
   * A helper function that extracts the list of authors from a Zotero Item.
   *
   * @param item - The target Zotero Item.
   * @returns The list of authors, each as a string, from the Item.
   * @private
   */
  static #getAuthorsFromZoteroItem(item: Zotero.Item) {
    let authors: string[] = [];
    const creators = item.getCreators();
    creators.forEach((creator) => {
      if (creator.creatorTypeID === 0) {
        authors.push(creator.firstName + " " + creator.lastName);
      }
    });
    return authors;
  }

  /**
   * A helper function that extracts the year value from a Zotero Item.
   *
   * @param item - The target Zotero Item.
   * @returns The year of publication as a string.
   * @private
   */
  static #getYearFromZoteroItem(item: Zotero.Item) {
    const itemDate = item.getField("date").toString();
    const candidates = itemDate.match(/[^\d]\d{4}[^\d]/);
    if (candidates === null || candidates.length === 0)
      return "";
    return candidates[0];
  }

  /**
   * A callback function for when the recommendation button is clicked.
   *
   * @param loadingViewElemId - The element ID for the Loading View element.
   * @param resultViewElemIds - The element IDs for each Result View element.
   * @param resultTitleElemIds - The element IDs for each Result Title element.
   * @param resultAuthorsElemIds - The element IDs for each Result Authors element.
   * @param resultYearElemIds - The element IDs for each Result Year element.
   * @param resultUrlElemIds - The element IDs for each Result URL element.
   */
  static onRecoButtonClicked(
    loadingViewElemId: string,
    resultViewElemIds: string[],
    resultTitleElemIds: string[],
    resultAuthorsElemIds: string[],
    resultYearElemIds: string[],
    resultUrlElemIds: string[]
  ) {
    const loadElem = document.getElementById(loadingViewElemId);
    if (loadElem === null)
      return;
    loadElem.innerText = getString("polarrec.reco.load");
    loadElem.style.display = "block";

    const targetItem = ZoteroPane.getSelectedItems(false)[0];
    const targetAuthors = this.#getAuthorsFromZoteroItem(targetItem);
    const targetTitle = targetItem.getField("title").toString();
    const targetYear = this.#getYearFromZoteroItem(targetItem);
    const targetAbstract = targetItem.getField("abstractNote").toString();
    const targetUrl = targetItem.getField("url").toString();

    const targetData: any = {};
    if (targetAuthors.length !== 0)
      targetData.authors = targetAuthors;
    if (targetTitle !== "")
      targetData.title = targetTitle;
    if (targetYear !== "")
      targetData.year = targetYear;
    if (targetAbstract !== "")
      targetData.abstract = targetAbstract;
    if (targetUrl !== "")
      targetData.url = targetUrl;

    window.fetch(this.#getApiUrlBase() + "/recommend", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        targets: [targetData]
      })
    })
      .then((response: any) => response.json())
      .then((response: any) => {
        const related_resources: any[] = response["related"];

        for (let i = 0; i < related_resources.length; i++) {
          const viewElem = document.getElementById(resultViewElemIds[i]);
          const titleElem = document.getElementById(resultTitleElemIds[i]);
          const authorsElem = document.getElementById(resultAuthorsElemIds[i]);
          const yearElem = document.getElementById(resultYearElemIds[i]);
          const urlElem = document.getElementById(resultUrlElemIds[i]);
          if (
            viewElem === null ||
            titleElem === null ||
            authorsElem === null ||
            yearElem === null ||
            urlElem === null
          )
            continue;

          titleElem.innerText = related_resources[i].title;
          authorsElem.innerText = related_resources[i].authors
            .reduce((text: string, author: string) => text + ", " + author);
          yearElem.innerText = related_resources[i].year;
          urlElem.innerText = related_resources[i].url;

          loadElem.style.display = "none";
          viewElem.style.display = "block";
        }
      })
      .catch((error: any) => {
        loadElem.innerText = error;
        loadElem.style.display = "block";
      });
  }
}