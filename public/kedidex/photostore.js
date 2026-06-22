/* KediDex — gerçek kedi fotoğrafı deposu (IndexedDB, lokal; sunucuya gitmez) */
window.KD = window.KD || {};
KD.photos = (function () {
  const DB = 'kedidex', STORE = 'photos';
  let dbp = null;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject('no-idb');
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => { const d = req.result; if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbp;
  }
  async function save(id, dataUrl) {
    try {
      const db = await open();
      return await new Promise((res, rej) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(dataUrl, id);
        tx.oncomplete = () => res(true);
        tx.onerror = () => rej(tx.error);
      });
    } catch (e) { return false; }
  }
  async function get(id) {
    try {
      const db = await open();
      return await new Promise((res) => {
        const tx = db.transaction(STORE, 'readonly');
        const r = tx.objectStore(STORE).get(id);
        r.onsuccess = () => res(r.result || null);
        r.onerror = () => res(null);
      });
    } catch (e) { return null; }
  }
  async function remove(id) {
    try { const db = await open(); const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(id); } catch (e) {}
  }
  return { save, get, remove };
})();
