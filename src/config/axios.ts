import axios from "axios";

const instance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_SKI_API_BASE,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

export default instance;
