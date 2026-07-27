import '@/app/styles.css';
import { initClient } from 'rwsdk/client';

// Hydrate the server-rendered React tree so that `"use client"` components
// (the live dashboard) become interactive in the browser.
initClient();
