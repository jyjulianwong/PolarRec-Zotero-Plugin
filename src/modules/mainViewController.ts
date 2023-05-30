import { MainViewControllable, MainView } from "./mainView";
import { CustomLogger } from "./customLogger";
import ZoteroToolkit from "zotero-plugin-toolkit/dist/index";

export class MainViewController implements MainViewControllable {
  #recoArxivRsDbAllowed = false;
  #recoIeeeXploreRsDbAllowed = false;
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
   * @returns All Zotero Items currently in view, e.g. the selected Collection.
   * @private
   */
  #getZoteroItemsInCurrView(): Zotero.Item[] {
    const items = ZoteroPane.getSortedItems();
    CustomLogger.log(
      `Found ${items.length} Zotero.Items in current view`,
      "warning",
      "MainViewController"
    );
    return items;
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
      if (creator.creatorTypeID === Zotero.CreatorTypes.getID("author")) {
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
  #getRecoFilter(targetData: any[]): any {
    const filter: any = {};
    if (targetData[0].hasOwnProperty("authors"))
      if (this.#recoAuthorsFiltered)
        // TODO: Extract authors for all target items.
        filter.authors = targetData[0].authors;
    if (targetData[0].hasOwnProperty("conference_name"))
      if (this.#recoConfNameFiltered)
        // TODO: Extract conference names for all target items.
        filter.conference_name = targetData[0].conference_name;
    return filter;
  }

  #sendRecoRequest(targetItems: Zotero.Item[], existingItems: Zotero.Item[]) {
    const targetData = targetItems.map(item => {
      return this.#getDataFromZoteroItem(item);
    });
    const existingData = existingItems.map(item => {
      return this.#getDataFromZoteroItem(item);
    });
    const filter = this.#getRecoFilter(targetData);

    let resourceDatabases = [];
    if (this.#recoArxivRsDbAllowed)
      resourceDatabases.push("arxiv");
    if (this.#recoIeeeXploreRsDbAllowed)
      resourceDatabases.push("ieeexplore");

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
        "target_resources": targetData,
        "existing_resources": existingData,
        "filter": filter,
        "resource_databases": resourceDatabases
      })
    })
      .then((response: Response) => {
        if (!response.ok)
          throw Error(`${apiUrl}: ${response.status}: ${response.statusText}`);
        return response;
      })
      .then((response: Response) => response.json())
      .then((response: any) => {
        const procTime: number = response["processing_time"];
        const rankedExistingData: any[] = response["ranked_existing_resources"];
        const rankedDatabaseData: any[] = response["ranked_database_resources"];
        const rankedCitationData: any[] = response["ranked_citation_resources"];

        if (this.#view !== undefined) {
          const resultLength = rankedExistingData.length + rankedDatabaseData.length + rankedCitationData.length;
          const targetText = targetItems.length === 1 ? `"${targetItems[0].getField("title").toString()}"` : `${targetItems.length} items`;
          const procTimeText = `Loaded ${resultLength} results in ${procTime.toFixed(3)} seconds for ${targetText}.`
          this.#view.updateResultViews([
            rankedExistingData,
            rankedDatabaseData,
            rankedCitationData
          ]);
          this.#view.updateLoadingView(false, procTimeText);
        }
      })
      .catch((error: any) => {
        if (this.#view !== undefined)
          this.#view.updateLoadingView(false, error.toString());
      });
  }

  constructor() {}

  /**
   * Adds this controller as an event listener of the main view.
   * This must be called after the view has been registered.
   *
   * @param view: The view that is controlled by this controller.
   */
  bindToView(view: MainView) {
    view.addRecoArxivRsDbListener(this);
    view.addRecoIeeeXploreRsDbListener(this);
    view.addRecoAuthorsFilterListener(this);
    view.addRecoConfNameFilterListener(this);
    view.addRecoItemButtonListener(this);
    view.addRecoItemsInViewButtonListener(this);
    this.#view = view;
  }

  /**
   * A callback function for when the ArXiv database filter is clicked.
   */
  onRecoArxivRsDbClicked(checked: boolean) {
    this.#recoArxivRsDbAllowed = checked;
    CustomLogger.log(
      `ArXiv database allowed in recommendations: ${checked}`,
      "warning",
      "MainViewController"
    );
  }

  /**
   * A callback function for when the IEEE Xplore database filter is clicked.
   */
  onRecoIeeeXploreRsDbClicked(checked: boolean) {
    this.#recoIeeeXploreRsDbAllowed = checked;
    CustomLogger.log(
      `IEEE Xplore database allowed in recommendations: ${checked}`,
      "warning",
      "MainViewController"
    );
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
  onRecoItemButtonClicked() {
    if (this.#view !== undefined) {
      this.#view.updateResultViews([]);
      this.#view.updateLoadingView(true);
    }

    const targetItems = [this.#getCurrZoteroItem()];
    const existingItems = this.#getZoteroItemsInCurrView();
    this.#sendRecoRequest(targetItems, existingItems);
  }

  /**
   * A callback function for when the recommendation button for all items in
   * view is clicked.
   */
  onRecoItemsInViewButtonClicked() {
    if (this.#view !== undefined) {
      this.#view.updateResultViews([]);
      this.#view.updateLoadingView(true);
    }

    const targetItems = this.#getZoteroItemsInCurrView();
    this.#sendRecoRequest(targetItems, []);
  }
}