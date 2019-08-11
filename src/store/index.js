import {flow, types} from 'mobx-state-tree';
import * as browserfs from "browserfs";
import * as pify from "pify";
import * as git from "isomorphic-git";
import {Course} from "./Course";

let docker_eps = window._env_.DOCKER_ENDPOINT.split(',');

export const Store = types.model('Store', {
  repo: window.location.hash.substr(1),
  docker_endpoint: docker_eps[Math.floor(Math.random()*docker_eps.length)],
  course: types.optional(Course, {}),
  // viewStore: types.optional(ViewStore, {}),
}).volatile(self => ({
  bfs: {},
  pfs: {},
  loading: true,
  completeIndex: localStorage.getItem( `${encodeURIComponent(self.repo)}/completeIndex`) || 0
})).views(self => ({
  get dir() {
    return encodeURIComponent(self.repo)
  }
})).actions(self => {
  const fetchCourse = flow(function* () {
    try {
      yield self.pfs.exists(`${self.dir}/course.json`);
      yield git.clone({
        dir: self.dir,
        // corsProxy: 'http://cors.kfcoding.com',
        corsProxy: window._env_.GIT_CORS || 'https://cors.isomorphic-git.org',
        url: self.repo,
        singleBranch: true,
        depth: 1
      });
    } catch (e) { // dir exists will goes here
      yield git.pull({
        dir: self.dir,
        ref: 'master',
        fastForwardOnly: true,
        singleBranch: true
      })
    }
    let data = yield self.pfs.readFile(`${self.dir}/course.json`);
    self.course = JSON.parse(data.toString());
    self.course.preloadData();
    self.loading = false;
  });

  return ({
    afterCreate: flow(function* () {
      yield pify(browserfs.configure)({fs: "IndexedDB", options: {}});
      self.bfs = browserfs.BFSRequire('fs');
      self.pfs = pify(self.bfs);
      git.plugins.set('fs', self.bfs);
      yield fetchCourse();
    }),
    setCompleteIndex: index => {
      self.completeIndex = index;
      localStorage.setItem(`${self.dir}/completeIndex`, index)
    }
  })
});
