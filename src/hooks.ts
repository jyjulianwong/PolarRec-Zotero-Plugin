import { MainView } from "./modules/mainView";
import { MainViewController } from "./modules/mainViewController";
import { config } from "../package.json";
import { initLocale } from "./modules/locale";

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);
  initLocale();
  ztoolkit.ProgressWindow.setIconURI(
    "default",
    `chrome://${config.addonRef}/content/icons/favicon.png`
  );

  const mainView = new MainView();
  const mainViewController = new MainViewController();
  mainView.register();
  mainViewController.bindToView(mainView);
}

function onShutdown(): void {
  ztoolkit.unregisterAll();
  // Remove addon object
  addon.data.alive = false;
  delete Zotero[config.addonInstance];
}

export default {
  onStartup,
  onShutdown
};
