import type { FileNaming, ReportOptions } from "./types";
export const emptyFileNaming: FileNaming = { tctd: "", sequence: "" };
export const defaultReportOptions: ReportOptions = { ownerPolicy: "distinct", order: "code", file: emptyFileNaming };
