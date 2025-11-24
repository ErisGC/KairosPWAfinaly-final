// src/services/signalR.js (o .cs si así lo tienes en el proyecto, pero es JS)
import * as signalR from "@microsoft/signalr";

let connection = null;

export const startConnection = async () => {
  if (connection) return connection;

  connection = new signalR.HubConnectionBuilder()
    .withUrl(`http://${window.location.hostname}:7299/Hubs/NotificationsHub`)
    .withAutomaticReconnect()
    .build();

  await connection.start();
  return connection;
};
