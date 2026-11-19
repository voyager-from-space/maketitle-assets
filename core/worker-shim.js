// Worker entry shared by maketitle and papershed. A same-origin worker file of the app sets self.__MT_ASSETS__ (the absolute URL
// of this repository's GitHub Pages root, ending in "/") and then calls importScripts() on this file.
// Why not one worker file here: browsers refuse to start a Worker from another origin, and the data-package loader keys its
// IndexedDB cache on the worker's own URL, so the app must own a stable same-origin worker URL.
//
// The big engine/data files are not next to the scripts: they are gzip streams cut into parts (manifest.json). This shim answers
// fetch() for those names by downloading the parts in order and gunzipping them with DecompressionStream, so the stock BusyTeX code
// never knows the difference. It posts { mt_net: bytes } messages with the number of bytes downloaded so far.
const ASSETS = self.__MT_ASSETS__;
const nativeFetch = self.fetch.bind(self);
const manifestPromise = nativeFetch(ASSETS + 'manifest.json').then((r) => r.json());
let netBytes = 0;
const notify = () => self.postMessage({ mt_net: netBytes });
let lastNote = 0, flush = null;
const count = (n) => { netBytes += n; const t = Date.now(); if (t - lastNote > 250) { lastNote = t; notify(); } else if (!flush) flush = setTimeout(() => { flush = null; lastNote = Date.now(); notify(); }, 300); };

function gunzipParts(urls) {
  let i = 0, reader = null, next = null;
  const open = (k) => nativeFetch(urls[k]).then((r) => { if (!r.ok) throw new Error(r.status + ' ' + urls[k]); return r; });
  const src = new ReadableStream({
    async pull(ctrl) {
      for (;;) {
        if (!reader) {
          if (i >= urls.length) { notify(); ctrl.close(); return; }
          const res = await (next || open(i));
          i++; next = i < urls.length ? open(i) : null;
          reader = res.body.getReader();
        }
        const { done, value } = await reader.read();
        if (done) { reader = null; continue; }
        count(value.length);
        ctrl.enqueue(value);
        return;
      }
    },
  });
  return src.pipeThrough(new DecompressionStream('gzip'));
}

self.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input.url;
  const name = String(url).split(/[?#]/)[0].split('/').pop();
  if (/\.(data|wasm)$/.test(name)) {
    const ent = (await manifestPromise)[name];
    if (ent) {
      const headers = { 'Content-Length': String(ent.size), 'Content-Type': name.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream' };
      return new Response(gunzipParts(ent.parts.map((p) => ASSETS + 'parts/' + p)), { status: 200, headers });
    }
  }
  return nativeFetch(input, init);
};

importScripts(ASSETS + 'core/busytex_biber.js');
importScripts(ASSETS + 'core/busytex_pipeline.js');

self.pipeline = null;

onmessage = async ({ data: { files, main_tex_path, bibtex, biber, makeindex, rerun, busytex_wasm, busytex_js, biber_js, biber_wasm, biber_data, preload_data_packages_js, data_packages_js, texmf_local, preload, verbose, driver, remote_endpoint, shell_escape, load_shell_handler_script, read_project_files, write_texlive_remote_files, write_texlive_remote_misses } }) => {
    // TODO: cache data packages from here? https://developer.mozilla.org/en-US/docs/Web/API/Cache

    if (busytex_wasm && busytex_js && preload_data_packages_js) {
        try {
            self.pipeline = new BusytexPipeline(busytex_js, busytex_wasm, data_packages_js, preload_data_packages_js, texmf_local, msg => postMessage({ print: msg }), applet_versions => postMessage({ initialized: applet_versions }), preload, BusytexPipeline.ScriptLoaderWorker, biber_js, biber_wasm, biber_data);
        }
        catch (err) {
            postMessage({ exception: 'Exception during initialization: ' + err.toString() + '\nStack:\n' + err.stack });
        }
    }
    else if (load_shell_handler_script) {
        try {
            importScripts(load_shell_handler_script);
            if (self.handler_ready)
                await self.handler_ready;
            postMessage({ shell_handler_script_loaded: load_shell_handler_script });
        }
        catch (err) {
            postMessage({ exception: 'Exception loading shell handler script: ' + err.toString() + '\nStack:\n' + err.stack });
        }
    }
    else if (read_project_files && self.pipeline) {
        try {
            postMessage({ project_files: await self.pipeline.read_project_files(read_project_files.dir || null) });
        }
        catch (err) {
            postMessage({ exception: 'Exception reading project files: ' + err.toString() + '\nStack:\n' + err.stack });
        }
    }
    else if (write_texlive_remote_files && self.pipeline) {
        try {
            await self.pipeline.write_texlive_remote_files(write_texlive_remote_files);
            postMessage({ texlive_remote_written: true });
        }
        catch (err) {
            postMessage({ exception: 'Exception writing remote files: ' + err.toString() + '\nStack:\n' + err.stack });
        }
    }
    else if (write_texlive_remote_misses && self.pipeline) {
        try {
            await self.pipeline.write_texlive_remote_misses(write_texlive_remote_misses);
            postMessage({ texlive_remote_misses_written: true });
        }
        catch (err) {
            postMessage({ exception: 'Exception writing remote misses: ' + err.toString() + '\nStack:\n' + err.stack });
        }
    }
    else if (files && self.pipeline) {
        try {
            postMessage(await self.pipeline.compile(files, main_tex_path, bibtex, biber, makeindex, rerun, verbose, driver, data_packages_js, remote_endpoint, shell_escape === true))
        }
        catch (err) {
            postMessage({ exception: 'Exception during compilation: ' + err.toString() + '\nStack:\n' + err.stack });
        }
    }
};