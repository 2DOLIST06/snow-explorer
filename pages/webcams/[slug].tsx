import type { GetServerSideProps } from "next";
import WebcamsDirectory, { type WebcamsDirectoryProps } from "@/components/webcams/WebcamsDirectory";
import { getWebcamsPageProps } from "@/lib/webcamPages";
export const getServerSideProps: GetServerSideProps<WebcamsDirectoryProps> = getWebcamsPageProps;
export default WebcamsDirectory;
