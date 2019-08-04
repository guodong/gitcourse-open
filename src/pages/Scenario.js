import React, {Component} from 'react';
import {inject, observer} from "mobx-react";
import SplitPane from "react-split-pane";
import Step from "./Step";
import Term from "./Term";
import {Button, Icon, notification, Modal, Switch} from "antd";
import {Link} from "react-router-dom";
// import Desktop from "./Desktop";
import {Tabs} from "antd/lib/tabs";
import TrainPanel from "./TrainPanel";

function showModal() {
  Modal.success({
    title: 'Congratulations!',
    content: '恭喜你！你已完成全部实训课程！',
  });
}

class Scenario extends Component {
  state = {
    stepIndex: 0,
    showDesktop: false
  };

  componentWillUpdate() {
    if (this.props.store.course.scenarios[this.props.match.params.index]) {
      if (this.props.store.course.scenarios[this.props.match.params.index].created ===false)
        this.props.store.course.scenarios[this.props.match.params.index].createContainer();
    }
  }

  componentDidMount() {
    if (this.props.store.course.scenarios[this.props.match.params.index]) {
      // if (this.props.store.course.scenarios[this.props.match.params.index].created == false)
        this.props.store.course.scenarios[this.props.match.params.index].createContainer();
    }
  }

  componentWillUnmount() {
    this.props.store.course.scenarios[this.props.match.params.index].clearContainer();
  }

  setComplete() {
    if (this.props.match.params.index * 1 === this.props.store.completeIndex * 1) {
      this.props.store.setCompleteIndex(this.props.match.params.index * 1 + 1);
    }
  }

  openNotification() {
    notification['info']({
      message: '提示',
      description: '您还未完成本步骤的内容！',
    });
  }

  render() {
    let scenario = this.props.store.course.scenarios[this.props.match.params.index];
    if (!scenario) {
      return <div></div>
    }

    return (
      <SplitPane split="vertical" minSize={50} defaultSize={scenario.steps[this.state.stepIndex].hideTerminal ? '100%' : 450} style={{position: 'relative'}}>
        <div style={{height: '100%', overflow: 'auto'}}>
          <div style={{
            height: 40,
            lineHeight: '40px',
            textAlign: 'center',
            fontSize: 24,
            background: '#3095d2',
            color: '#fff'
          }}>{scenario.title}</div>
          <Step step={scenario.steps[scenario.stepIndex]} scenario={scenario}/>
          <div style={{padding: 20, position: 'relative', width: '100%'}}>
            {scenario.stepIndex !== scenario.steps.length - 1 &&
            <div style={{textAlign: 'center', position: 'absolute', width: '100%'}}>
              <Button type="primary" onClick={() => {
                scenario.setStepIndex(0);
                this.props.history.push('/' + window.location.hash);
              }}>
                <Icon type="book"/> 返回目录
              </Button>
            </div>
            }
            {scenario.stepIndex !== 0 &&
            <Button type="default" onClick={() => {
              scenario.setStepIndex(scenario.stepIndex - 1)
            }}>
              <Icon type="left"/>上一步
            </Button>
            }
            {scenario.stepIndex !== scenario.steps.length - 1 &&
            <Button type="primary" style={{float: 'right'}} onClick={() => {
              scenario.steps[scenario.stepIndex].checkStep().then(d => {
                if (d === true) {
                  scenario.setStepIndex(scenario.stepIndex + 1)
                } else {
                  this.openNotification();
                }
              });
            }}>
              下一步<Icon type="right"/>
            </Button>
            }
            {scenario.stepIndex === scenario.steps.length - 1 &&
            <Button type="primary" style={{float: 'right'}} onClick={() => {
              scenario.steps[scenario.stepIndex].checkStep().then(d => {
                if (d === true) {
                  this.setComplete();
                  setTimeout(() => {
                    this.props.history.push('/' + window.location.hash);
                  }, 500)
                } else {
                  this.openNotification();
                }
              });
            }}>
              完成<Icon type="book"/>
            </Button>
            }
            {scenario.stepIndex === scenario.steps.length - 1 &&
            this.props.match.params.index === this.props.store.course.scenarios.length - 1 &&
            showModal()
            }
          </div>
        </div>
        <div style={{height: '100%', background: '#000', overflow: 'hidden'}}>
          <TrainPanel scenario={scenario} step={scenario.stepIndex}/>
        </div>
      </SplitPane>
    )
  }
}

export default inject('store')(observer(Scenario));
