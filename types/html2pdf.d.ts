declare module 'html2pdf.js' {
    interface HTML2PDF {
      set(options: any): HTML2PDF;
      from(element: HTMLElement): HTML2PDF;
      save(): Promise<void>;
    }
  
    function html2pdf(): HTML2PDF;
    export default html2pdf;
  }