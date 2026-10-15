import type { GetServerSideProps } from "next";
import type { WebcamsDirectoryProps } from "@/components/webcams/WebcamsDirectory";
import { getWebcamsPageProps } from "@/lib/webcamPages";
export const getServerSideProps: GetServerSideProps<WebcamsDirectoryProps> = getWebcamsPageProps;
// The menu and station return links use /webcams; share the SEO landing page.
export { default } from "../webcam";
