import { MainViewControllable, MainView } from "./mainView";
import { CustomLogger } from "./customLogger";

export class MainViewController implements MainViewControllable {
  #recoAuthorsFiltered = false;
  #recoConfNameFiltered = false;

  #view?: MainView;

  /**
   * @returns The PolarRec API's base URL depending on if the plugin was built
   * in development mode.
   * @private
   */
  #getApiUrlBase(): string {
    return __env__ === "development" ?
      // If in development mode, use locally-deployed Flask server instead.
      "http://127.0.0.1:5000" :
      // Otherwise, use latest stable release of PolarRec API.
      "http://polarrec-env.eba-nzautmta.eu-west-2.elasticbeanstalk.com";
  }

  /**
   * @returns The currently selected Zotero Item.
   * @private
   */
  #getCurrZoteroItem(): Zotero.Item {
    return ZoteroPane.getSelectedItems(false)[0];
  }

  /**
   * @returns All Zotero Items contained in the currently selected Collection.
   * @private
   */
  #getZoteroItemsInCurrCollection(): Zotero.Item[] {
    const collection = ZoteroPane.getSelectedCollection();
    if (collection === undefined)
      return [];
    return collection.getChildItems();
  }

  /**
   * A helper function that extracts the list of authors from a Zotero Item.
   *
   * @param item - The target Zotero Item.
   * @returns The list of authors, each as a string, from the Item.
   * @private
   */
  #getAuthorsFromZoteroItem(item: Zotero.Item): string[] {
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
  #getYearFromZoteroItem(item: Zotero.Item): string {
    const itemDate = item.getField("date").toString();
    const candidates = itemDate.match(/[^\d]\d{4}[^\d]/);
    if (candidates === null || candidates.length === 0)
      return "";
    return candidates[0];
  }

  /**
   * A helper function that converts a Zotero Item into a PolarRec JSON object.
   *
   * @param item - The target Zotero Item.
   * @returns The JSON object to be sent to the PolarRec API.
   * @private
   */
  #getDataFromZoteroItem(item: Zotero.Item): any {
    const authors = this.#getAuthorsFromZoteroItem(item);
    const conferenceName = item.getField("conferenceName").toString();
    const conferenceLocation = item.getField("place").toString();
    const title = item.getField("title").toString();
    const year = this.#getYearFromZoteroItem(item);
    const abstract = item.getField("abstractNote").toString();
    const doi = item.getField("DOI").toString();
    const url = item.getField("url").toString();

    const data: any = {};
    if (authors.length !== 0)
      data.authors = authors;
    if (conferenceName.length !== 0)
      data.conference_name = conferenceName;
    if (conferenceLocation.length !== 0)
      data.conference_location = conferenceLocation;
    if (title !== "")
      data.title = title;
    if (year !== "")
      data.year = year;
    if (abstract !== "")
      data.abstract = abstract;
    if (doi !== "")
      data.doi = doi;
    if (url !== "")
      data.url = url;

    return data;
  }

  /**
   * A helper fuction that generates a filter JSON object based on user's input.
   *
   * @param targetData - The target Zotero Item in JSON data format.
   * @returns The filter JSON object to be sent to the PolarRec API.
   * @private
   */
  #getRecoFilter(targetData: any): any {
    const filter: any = {};
    if (targetData.hasOwnProperty("authors"))
      if (this.#recoAuthorsFiltered)
        filter.authors = targetData.authors;
    if (targetData.hasOwnProperty("conference_name"))
      if (this.#recoConfNameFiltered)
        filter.conference_name = targetData.conference_name;
    return filter;
  }

  constructor() {}

  /**
   * Adds this controller as an event listener of the main view.
   * This must be called after the view has been registered.
   *
   * @param view: The view that is controlled by this controller.
   */
  bindToView(view: MainView) {
    view.addRecoAuthorsFilterListener(this);
    view.addRecoConfNameFilterListener(this);
    view.addRecoButtonListener(this);
    this.#view = view;
  }

  /**
   * A callback function for when the authors filter is clicked.
   */
  onRecoAuthorsFilterClicked(checked: boolean) {
    this.#recoAuthorsFiltered = checked;
    CustomLogger.log(
      `Authors filtered in recommendations: ${checked}`,
      "warning",
      "MainViewController"
    );
  }

  /**
   * A callback function for when the conference name filter is clicked.
   */
  onRecoConfNameFilterClicked(checked: boolean) {
    this.#recoConfNameFiltered = checked;
    CustomLogger.log(
      `Conference name filtered in recommendations: ${checked}`,
      "warning",
      "MainViewController"
    );
  }

  /**
   * A callback function for when the recommendation button is clicked.
   */
  onRecoButtonClicked() {
    if (this.#view !== undefined) {
      this.#view.updateResultViews([]);
      this.#view.updateLoadingView(true);
    }

    const targetItem = this.#getCurrZoteroItem();
    const targetData = [this.#getDataFromZoteroItem(targetItem)];
    const existingRelatedItems = this.#getZoteroItemsInCurrCollection();
    const existingRelatedData = existingRelatedItems.map(item => {
      return this.#getDataFromZoteroItem(item);
    });
    const filter = this.#getRecoFilter(targetData);

    const apiUrl = this.#getApiUrlBase() + "/recommend";
    CustomLogger.log(
      `Sending POST request to ${apiUrl}`,
      "warning",
      "MainViewController"
    );
    window.fetch(apiUrl, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "targets": targetData,
        "existing_related": existingRelatedData,
        "filter": filter
      })
    })
      .then((response: Response) => {
        if (!response.ok)
          throw Error(`${apiUrl}: ${response.status}: ${response.statusText}`);
        return response;
      })
      .then((response: Response) => response.json())
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