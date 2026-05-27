// @ts-ignore
import pdfParse from 'pdf-parse';

export const extractTextFromPDF = async (buffer: Buffer) => {
    // @ts-ignore
    const data = await pdfParse(buffer);
    return data.text;
};
