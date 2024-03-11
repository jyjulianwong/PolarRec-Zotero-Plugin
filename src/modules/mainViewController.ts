import { MainViewControllable, MainView } from "./mainView";
import { CustomLogger } from "./customLogger";

export class MainViewController implements MainViewControllable {
  // State variables for the filters and controls on the main view.
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
      "http://34.73.167.164:8080";
  }

  /**
   * A helper function that extracts text in between <p> and </p> tags in HTML
   * documents.
   *
   * @param htmlString - The contents of the HTML document as a singular string.
   * @returns The extracted text in between <p> and </p> tags.
   * @private
   */
  #getHtmlPTagText(htmlString: string): string {
    // Identify tokens that are placed between <p> and </p> tags.
    const pTagTokens = htmlString.match(/<p\b[^>]*>(.*?)<\/p>/g);
    if (pTagTokens === null)
      // No <p> text exists in the HTML document.
      return "";
    else
      // Remove the <p> and </p> tags and return the inner-text.
      return pTagTokens.join(" ").replace(/<[^>]+>/g, "");
  }

  /**
   * @returns The currently selected Zotero Item.
   * @private
   */
  #getCurrZoteroItem(): Zotero.Item {
    return ZoteroPane.getSelectedItems(false)[0];
  }

  /**
   * @returns All Zotero items currently in view, e.g. the selected collection.
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
    const candidates = itemDate.match(/\b\d{4}\b/g);
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
  async #getDataFromZoteroItem(item: Zotero.Item): Promise<any> {
    // Extract all necessary information from the Zotero item.
    const authors = this.#getAuthorsFromZoteroItem(item);
    const conferenceName = item.getField("conferenceName").toString();
    const conferenceLocation = item.getField("place").toString();
    const title = item.getField("title").toString();
    const year = this.#getYearFromZoteroItem(item);
    const abstract = item.getField("abstractNote").toString();
    const doi = item.getField("DOI").toString();
    const url = item.getField("url").toString();

    // Conduct checks for any null or empty values.
    // Do not include empty values into the data object.
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

    if (item.itemType === "encyclopediaArticle"|| item.itemType === "webpage") {
      // Web pages do not have proper abstracts.
      // The full inner-text needs to be extracted instead.
      CustomLogger.log(
        `Extracting text from web page item: ${title}`,
        "warning",
        "MainViewController"
      );
      // The full inner-text (or "snapshot") may be stored as an attachment.
      const attachmentItemIds = item.getAttachments();
      if (attachmentItemIds.length === 0)
        // No snapshot attachment has been found.
        return data;
      const attachmentItem = Zotero.Items.get(attachmentItemIds[0]);
      // Get the absolute file path to the attachment in local storage as a URL.
      const attachmentFilepath = attachmentItem.getLocalFileURL();

      // Get the snapshot attachment through an HTTP GET request.
      const response = await window.fetch(attachmentFilepath);
      if (!response.ok) {
        // An error has occurred when locating the file in local storage.
        CustomLogger.log(
          `No snapshot attachment found for web page item: ${title}`,
          "error",
          "MainViewController"
        );
        return data;
      }
      // Extract the contents of the snapshot attachment file.
      const responseText = await response.text();

      // Only extract useful textual content from the file, i.e. ignore HTML tags.
      const pTagText = this.#getHtmlPTagText(responseText);
      if (pTagText !== undefined) {
        if (data.abstract === undefined)
          // The abstract does not exist as a data field yet.
          data.abstract =  pTagText;
        else
          // There already exists some abstract text for this item.
          data.abstract += pTagText;
        CustomLogger.log(
          `Successfully extracted text from web page item: ${title}`,
          "warning",
          "MainViewController"
        );
      }
    }

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
        // FIXME: Extract authors for all target items instead of the first one.
        filter.authors = targetData[0].authors;
    if (targetData[0].hasOwnProperty("conference_name"))
      if (this.#recoConfNameFiltered)
        // FIXME: Extract conference names for all target items instead of the first one.
        filter.conference_name = targetData[0].conference_name;
    return filter;
  }

  /**
   * Sends a recommendation request to the PolarRec web API application.
   *
   * @param targetItems - The list of Zotero items treated as targets.
   * @param existingItems - The list of existing Zotero items in the library.
   * @private
   */
  async #sendRecoRequest(targetItems: Zotero.Item[], existingItems: Zotero.Item[]) {
    const targetData = await Promise.all(targetItems.map(async item => {
      return await this.#getDataFromZoteroItem(item);
    }));
    const existingData = await Promise.all(existingItems.map(async item => {
      return await this.#getDataFromZoteroItem(item);
    }));
    const filter = this.#getRecoFilter(targetData);

    // Check which of the resource databases the user has allowed in the filter.
    let resourceDatabases = [];
    if (this.#recoArxivRsDbAllowed)
      resourceDatabases.push("arxiv");
    if (this.#recoIeeeXploreRsDbAllowed)
      resourceDatabases.push("ieeexplore");

    // Trigger the recommendation process through the PolarRec web API.
    const apiUrl = this.#getApiUrlBase() + "/recommend";
    CustomLogger.log(
      `Sending POST request to ${apiUrl}`,
      "warning",
      "MainViewController"
    );
    // FIXME: Make the operation asynchronous rather than use callbacks.
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
        // The API response has been successfully received.
        const procTime: number = response["processing_time"];
        const rankedExistingData: any[] = response["ranked_existing_resources"];
        const rankedDatabaseData: any[] = response["ranked_database_resources"];

        if (this.#view !== undefined) {
          const resultLength = rankedExistingData.length + rankedDatabaseData.length;
          const targetText = targetItems.length === 1 ? `"${targetItems[0].getField("title").toString()}"` : `${targetItems.length} items`;
          const procTimeText = `Loaded ${resultLength} results in ${procTime.toFixed(3)} seconds for ${targetText}.`
          // Populate the results view.
          this.#view.updateResultViews([
            rankedExistingData,
            rankedDatabaseData
          ]);
          // Show the processing time of the API request.
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
    view.addResultUrlButtonListener(this);
    this.#view = view;
  }

  /**
   * A callback function for when the arXiv database filter is clicked.
   */
  onRecoArxivRsDbClicked(checked: boolean) {
    this.#recoArxivRsDbAllowed = checked;
    CustomLogger.log(
      `arXiv database allowed in recommendations: ${checked}`,
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
      // Clear any lingering results from the last recommendation process.
      this.#view.updateResultViews([]);
      // Show that the recommender system is loading.
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
      // Clear any lingering results from the last recommendation process.
      this.#view.updateResultViews([]);
      // Show that the recommender system is loading.
      this.#view.updateLoadingView(true);
    }

    // All items currently in view are considered "targets".
    const targetItems = this.#getZoteroItemsInCurrView();
    this.#sendRecoRequest(targetItems, []);
  }
}