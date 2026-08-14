import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

//create global variable
//create a queue that will contain all the request with 401 error and wait for refreshing token
let requestQueue: Array<{
  resolve: (request: unknown) => void;
  reject: (error: unknown) => void;
}> = [];

let isRefreshing = false; //flag is refreshing = true when there's a request's sending a refresh token request

//release queue function
const releaseQueue = (error: unknown = null) => {
  if (error) {
    requestQueue.forEach((request) => {
      request.reject(error);
    });
  } else {
    requestQueue.forEach((request) => {
      request.resolve(null);
    });
  }
  requestQueue = [];
};

//interceptor
//request
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    //assign error.config that contains all the request information and configuration to a new object
    const originalRequest = error.config;
    if (error?.response.status !== 401) {
      return Promise.reject(error);
    }
    const isAuthPage =
      typeof window !== "undefined" &&
      (window.location.pathname.startsWith("/auth/login") ||
        window.location.pathname.startsWith("/auth/register") ||
        window.location.pathname.startsWith("/auth/refresh-token"));

    //check if request is in authpage => throw 401, no need to send refresh-token request
    if (isAuthPage && typeof window !== "undefined") {
      return Promise.reject(error);
    }
    //if the code pass the if statement => the request is in another path
    //
    //we need t check the _retry flag.
    //if retry==true and there's 401 error => this refresh_token (long term token) is expired
    if (originalRequest._retry && error?.response.status === 401) {
      const isAuthPage =
        window.location.pathname.startsWith("/auth/login") ||
        window.location.pathname.startsWith("/auth/register");
      if (typeof window !== "undefined" && !isAuthPage) {
        window.location.href = `${process.env.NEXT_PUBLIC_API_ULR}/login`;
        return Promise.reject(error);
      }
    }

    // and need to send refresh-token request
    // that means the request need to retry resend request
    // set the _retry flag to true
    originalRequest._retry = true;

    //then check if there's any refresh_token request is sending
    //if true, the isRefreshing flag is true,
    if (isRefreshing) {
      //if isRefreshing => this request is not the first request to get 401 error and
      //and about to send the refresh token request
      //=> then we have to stop it from sending refresh token request
      //=> by add this 'request' to a queue
      return new Promise((resolve, reject) => {
        requestQueue.push({ resolve, reject });
      })
        .then(() => {
          //trigger when refresh token successfully
          //re-call the current api
          return api(originalRequest);
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    }
    //when isRefreshing == false => this current request is the first one to send refresh-token api
    isRefreshing = true;
    try {
      await api.get("/auth/refresh-token");
      //if success ==> release the queue
      releaseQueue(null);
      return api(originalRequest);
    } catch (err) {
      releaseQueue(err);
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
      }
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
