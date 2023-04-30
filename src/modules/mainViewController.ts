import { MainViewControllable, MainView } from "./mainView";

export class MainViewController implements MainViewControllable {
  #view?: MainView;

  #getApiUrlBase(): string {
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
  #getAuthorsFromZoteroItem(item: Zotero.Item) {
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
  #getYearFromZoteroItem(item: Zotero.Item) {
    const itemDate = item.getField("date").toString();
    const candidates = itemDate.match(/[^\d]\d{4}[^\d]/);
    if (candidates === null || candidates.length === 0)
      return "";
    return candidates[0];
  }

  constructor() {}

  /**
   * This must be called after the view has been registered.
   *
   * @param view: The view that is controlled by this controller.
   */
  bindToView(view: MainView) {
    view.addRecoButtonListener(this);
    this.#view = view;
  }

  /**
   * A callback function for when the recommendation button is clicked.
   */
  onRecoButtonClicked() {
    if (this.#view !== undefined) {
      this.#view.updateResultViews([]);
      this.#view.updateLoadingView(true);
    }

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
        const results: any[] = response["related"];

        if (this.#view !== undefined) {
          this.#view.updateResultViews(results);
          this.#view.updateLoadingView(false);
        }
      })
      .catch((error: any) => {
        if (this.#view !== undefined)
          this.#view.updateLoadingView(false, error.toString());
      });
  }
}