import express, { Router } from 'express';
import {
  match,
  validateName,
  validatePackage,
  encodeScopePackage,
  antiLoop,
} from '@verdaccio/middleware';
import { IAuth } from '@verdaccio/auth';
import { Storage } from '@verdaccio/store';
import { Config } from '@verdaccio/types';
import bodyParser from 'body-parser';
import semver from 'semver';

import whoami from './whoami';
import ping from './ping';
import user from './user';
import distTags from './dist-tags';
import publish from './publish';
import search from './search';
import pkg from './package';
import stars from './stars';
import profile from './v1/profile';
import token from './v1/token';
import v1Search from './v1/search';

if (semver.lte(process.version, 'v15.0.0')) {
  global.AbortController = require('abortcontroller-polyfill/dist/cjs-ponyfill').AbortController;
}

export default function (config: Config, auth: IAuth, storage: Storage): Router {
  /* eslint new-cap:off */
  const app = express.Router();
  /* eslint new-cap:off */

  // validate all of these params as a package name
  // this might be too harsh, so ask if it causes trouble
  app.param('package', validatePackage);
  app.param('filename', validateName);
  app.param('tag', validateName);
  app.param('version', validateName);
  app.param('revision', validateName);
  app.param('token', validateName);

  // these can't be safely put into express url for some reason
  // TODO: For some reason? what reason?
  app.param('_rev', match(/^-rev$/));
  app.param('org_couchdb_user', match(/^org\.couchdb\.user:/));
  app.param('anything', match(/.*/));
  app.use(auth.apiJWTmiddleware());
  app.use(bodyParser.json({ strict: false, limit: config.max_body_size || '10mb' }));
  // @ts-ignore
  app.use(antiLoop(config));
  // encode / in a scoped package name to be matched as a single parameter in routes
  app.use(encodeScopePackage);
  // for "npm whoami"
  whoami(app);
  pkg(app, auth, storage, config);
  profile(app, auth);
  // @deprecated endpoint, 404 by default
  search(app);
  user(app, auth, config);
  distTags(app, auth, storage);
  publish(app, auth, storage, config);
  ping(app);
  stars(app, storage);
  // @ts-ignore
  v1Search(app, auth, storage);
  token(app, auth, storage, config);
  return app;
}
