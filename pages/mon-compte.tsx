import type { GetServerSideProps } from "next";
export const getServerSideProps: GetServerSideProps = async () => ({ redirect: { destination: "/admin/account", permanent: false } });
export default function AccountRedirect() { return null; }
