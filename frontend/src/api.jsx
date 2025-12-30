import axios from 'axios';

const api = axios.create({
    baseURL: 'http://127.0.0.1:8000/api/',
});

// This is the most important part
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token'); // Make sure this key matches your login logic
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;