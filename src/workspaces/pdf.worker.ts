import { PDFDocument, degrees } from "pdf-lib";
import { zipSync } from "fflate";
import { parsePages } from "./pdfPages";
self.onmessage = async (e) => {
  try {
    const { inputs, pages, rotation, split } = e.data as {
      inputs: ArrayBuffer[];
      pages: string;
      rotation: number;
      split: boolean;
    };
    const output = await PDFDocument.create();
    const bundle: Record<string, Uint8Array> = Object.create(null);
    for (let f = 0; f < inputs.length; f++) {
      const source = await PDFDocument.load(inputs[f]);
      const selected = parsePages(pages, source.getPageCount());
      if (split) {
        for (const index of selected) {
          const part = await PDFDocument.create();
          const [page] = await part.copyPages(source, [index]);
          page.setRotation(
            degrees((page.getRotation().angle + rotation) % 360),
          );
          part.addPage(page);
          bundle[`${f + 1}-page-${index + 1}.pdf`] = await part.save();
        }
      } else {
        const copies = await output.copyPages(source, selected);
        for (const page of copies) {
          page.setRotation(
            degrees((page.getRotation().angle + rotation) % 360),
          );
          output.addPage(page);
        }
      }
      self.postMessage({ progress: `${f + 1}/${inputs.length} 처리 중` });
    }
    self.postMessage({
      output: split ? zipSync(bundle, { level: 1 }) : await output.save(),
      count: split ? Object.keys(bundle).length : output.getPageCount(),
    });
  } catch (err) {
    self.postMessage({
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
