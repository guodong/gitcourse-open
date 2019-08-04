import {types, flow, getRoot, getParent} from 'mobx-state-tree';

export const Step = types
  .model('Step', {
    title: '',
    text: '',
    content: '',
    check: '',
    preload: '',
    program: '',
    extraTab: '',
    hideTerminal: false
  }).volatile(self => ({
    passed: false,
    extraTabUrl: ''
  })).views(self => ({
    get store() {
      return getRoot(self);
    }
  })).actions(self => {

    const fetchText = flow(function* () {
      const path=getRoot(self).dir + '/' + self.text;
      let file = yield getRoot(self).pfs.readFile(path);
      self.content = file.toString();
    });

    const checkStep = flow(function* (cb) {
      if (self.passed) {
        return true;
      }
      if (self.check === '') {
        self.passed = true;
        return true;
      }
      let file = yield self.store.pfs.readFile(self.store.dir + '/' + self.check);
      let script = file.toString();
      let response=yield fetch(self.store.docker_endpoint + '/containers/' + getParent(self, 2).container_id + '/exec', {
        headers: {
          'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify({
          "AttachStdin": true,
          "AttachStdout": true,
          "AttachStderr": true,
          "Cmd": ["bash", "-c", script],
          "DetachKeys": "ctrl-p,ctrl-q",
          "Privileged": true,
          "Tty": true,
        })
      });
      let data=yield response.json();
      response=yield fetch(self.store.docker_endpoint + '/exec/' + data.Id + '/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          Detach: false,
          Tty: true
        })
      });
      data=yield response.text();
      self.setPassed(data !== '');
      return self.passed;
    });

    // const getPort = flow(function* (cb) {
    //   return fetch(self.store.docker_endpoint + '/containers/' + getParent(self, 2).container_id + '/json', {
    //     method: 'GET'
    //   }).then(resp => resp.json())
    //     .then(data => {
    //
    //       let desktop_port = data.NetworkSettings.Ports['8888/tcp'][0].HostPort;
    //       let extratab = self.extraTab;
    //       const path = extratab.substr(extratab.indexOf('/'));
    //       const host = self.store.docker_endpoint.match(/(http:\/\/).+?(?=:)/)[0];
    //       var matches = extratab.match(/(?<=\[).+?(?=])/mg);
    //       if (matches && matches.length > 0) {
    //         if (matches[0] === "domain") {
    //           self.setExtraTab(`http://${host}:${desktop_port}${path}`);
    //         }
    //         else {
    //           self.setExtraTab(`${matches[0]}${matches[1]}${path}`);
    //         }
    //       }
    //       console.log("extraTab", self.extraTab);
    //     })
    // });

    const getHostPort = flow(function* (port) {
      let response=yield fetch(self.store.docker_endpoint + '/containers/' + getParent(self, 2).container_id + '/json', {
        method: 'GET'
      });
      let data=yield response.json();
      return data.NetworkSettings.Ports[port.substr(1) + '/tcp'][0].HostPort;
    });

    const getExtraTabUrl = flow(function* () {
      let extratab = self.extraTab;
      const path = extratab.substr(extratab.indexOf('/'));
      const host = self.store.docker_endpoint.match(/(http:\/\/).+?(?=:)/)[0];
      var matches = extratab.match(/\[(.+?)]/mg);

      if (matches && matches.length > 0) {
        if (matches[0] === "[domain]") {console.log(matches[1].substr(1, matches[1].lastIndexOf(']')))
          let port = yield getHostPort(matches[1].substr(1, matches[1].lastIndexOf(']') - 1));
          if (getParent(self, 2).stepIndex === 0) {
            setTimeout(() => {
              self.setExtraTab(`${host}:${port}${path}`);
            }, 4000)
          } else {
            self.setExtraTab(`${host}:${port}${path}`);
          }
        }
        else {
          self.setExtraTab(extratab);
        }
      }
      console.log("extraTab", self.extraTabUrl);
    });

    const beforeStep = flow(function* (cb) {
      if (self.program) {
        let file = yield self.store.pfs.readFile(self.store.dir + '/' + self.program);
        let script = file.toString();
        let response = yield fetch(self.store.docker_endpoint + '/containers/' + getParent(self, 2).container_id + '/exec', {
          headers: {
            'Content-Type': 'application/json'
          },
          method: 'POST',
          body: JSON.stringify({
            "AttachStdin": true,
            "AttachStdout": true,
            "AttachStderr": true,
            "Cmd": ["sh", "-c", script],
            "DetachKeys": "ctrl-p,ctrl-q",
            "Privileged": true,
            "Tty": true,
          })
        });
        let data =yield response.json();
        yield fetch(self.store.docker_endpoint + '/exec/' + data.Id + '/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            Detach: false,
            Tty: true
          })
        })
      }
      getExtraTabUrl();
    });

    const preloadStep = flow(function* () {
      if (self.preload === '') {
        return
      }
      let file = yield self.store.pfs.readFile(self.store.dir + '/' + self.preload);
      let script = file.toString();
      try {
        eval(script);
      } catch (e) {
        console.log(e)
      }
    });

    return {
      afterCreate() {
        fetchText()
      },
      setTitle(title) {
        self.title = title;
      },
      setPassed(flag) {
        self.passed = flag;
      },
      setExtraTab(addr) {
        self.extraTabUrl = addr;
      },
      checkStep: checkStep,
      preloadStep: preloadStep,
      // inspectstep: getPort,
      beforeStep: beforeStep
    }
  });
