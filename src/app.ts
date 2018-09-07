import { WebhookClient } from 'discord.js';
import express = require('express');
import { Server } from 'http';
import io from 'socket.io';
import { AzureBot } from './azure-bot';
import {
  botEnabled as azureBotEnabled,
  discordHookEnabled,
  port
} from './config';
import { DiscordBot } from './discord-bot';
import { log } from './log';
import { Overlay } from './overlay';
import { changeLightColor, sendLightEffect } from './routes/lights';
import { scenesRoute } from './routes/scenes';

export class App {
  public overlay!: Overlay;
  public azureBot!: AzureBot;
  public app: express.Application;
  public io!: SocketIO.Server;
  public discordHook!: WebhookClient | undefined;
  private http!: Server;
  constructor() {
    this.app = express();
    this.startDiscordHook();
    this.startOverlay();
    this.startAzureBot();
    this.defineRoutes();
    this.config();
    this.listen();
  }

  public getApp(): express.Application {
    return this.app;
  }

  private startOverlay = () => {
    this.http = new Server(this.app);
    this.overlay = new Overlay();
    this.io = io(this.http);
  };

  private startAzureBot = () => {
    if (!azureBotEnabled) {
      this.azureBot = new AzureBot();
      this.azureBot.createNewBotConversation();
    }
  };

  private startDiscordHook = () => {
    if (discordHookEnabled) {
      this.discordHook = new DiscordBot().createDiscordHook();
    }
    this.discordHook = undefined;
  };

  private config(): void {
    this.app.set('view engine', 'pug');
    this.app.set('views', `${__dirname}/views`);
    this.app.use(express.static(__dirname));
  }

  private defineRoutes(): void {
    const router: express.Router = express.Router();
    router.get('/scenes', scenesRoute);

    router.get('/overlay-colors', (req, res) => {
      res.render('overlay-colors');
    });

    router.get('/lights/:color', changeLightColor);
    router.get('/lights/effects/:effect', sendLightEffect);

    router.get('/bulb/color', (req, res) => {
      let currentColor: string;
      if (this.overlay) {
        currentColor = this.overlay.getCurrentColor();
      } else {
        currentColor = 'blue';
      }
      res.json({ color: currentColor });
    });

    this.app.use('/', router);
  }

  private listen = (): void => {
    const runningMessage = `Overlay server is running on port http://localhost:${port}`;
    this.http.listen(port, () => {
      log('info', runningMessage);
    });
  };
}