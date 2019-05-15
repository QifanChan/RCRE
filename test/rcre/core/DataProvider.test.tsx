import React from 'react';
import axios from 'axios';
import {PageConfig, JSONRender} from 'rcre';
import {mount} from 'enzyme';
import moxios from 'moxios';
import {RCRETestUtil, setData} from 'rcre-test-tools';
import {DataProvider} from '../../../packages/rcre/src/core/DataProvider/Controller';
import {CoreKind} from '../../../packages/rcre/src/types';

describe('DataProvider', () => {
    beforeEach(() => {
        moxios.install(axios);
    });

    afterEach(() => {
        moxios.uninstall(axios);
    });

    it('init with defaultValue', () => {
        return new Promise((resolve, reject) => {
            let config: PageConfig<any> = {
                body: [
                    {
                        type: CoreKind.container,
                        model: 'initDataProvider',
                        data: {
                            name: 'helloworld'
                        },
                        dataProvider: [
                            {
                                mode: 'ajax',
                                namespace: 'demo',
                                config: {
                                    url: '/test/demo',
                                    method: 'GET',
                                    data: {
                                        name: '#ES{$data.name}'
                                    }
                                }
                            }
                        ],
                        children: [
                            {
                                type: CoreKind.text,
                                text: 'text'
                            }
                        ]
                    }
                ]
            };

            let test = new RCRETestUtil(config);

            moxios.wait(() => {
                let request = moxios.requests.mostRecent();
                let requestData = request.config.data;

                expect(JSON.parse(requestData).name).toBe('helloworld');

                request.respondWith({
                    status: 200,
                    response: {
                        data: '1234'
                    }
                }).then(ret => {
                    let state = test.getState();
                    expect(state.container.initDataProvider.demo.data).toBe('1234');
                    resolve();
                });
            });
        });
    });

    it('computer Task Queue', () => {
        let dataProvider = new DataProvider([
            {
                mode: 'ajax',
                namespace: 'API1',
                config: {
                    url: '/api1.json'
                }
            },
            {
                mode: 'ajax',
                namespace: 'API2',
                config: {
                    url: '/api2.json'
                },
                requiredParams: ['API1', 'API5']
            },
            {
                mode: 'ajax',
                namespace: 'API3',
                config: {
                    url: '/api3.json'
                },
                requiredParams: ['API2', 'API6']
            },
            {
                mode: 'ajax',
                namespace: 'API4',
                config: {
                    url: '/api4.json'
                },
                requiredParams: ['API2', 'API6']
            },
            {
                mode: 'ajax',
                namespace: 'API5',
                config: {}
            },
            {
                mode: 'ajax',
                namespace: 'API6',
                config: {},
                requiredParams: ['API5']
            }
        ]);

        expect(dataProvider.taskQueue).toEqual([['API1', 'API5'], ['API2', 'API6'], ['API3', 'API4']]);
    });

    it('repeat namespace deps kind 1', () => {
        let dataProvider = new DataProvider([
            {
                mode: 'ajax',
                namespace: 'API1',
                config: {
                    url: '/api1.json'
                }
            },
            {
                mode: 'ajax',
                namespace: 'API2',
                config: {
                    url: '/api2.json'
                },
                requiredParams: ['API1', 'API5']
            },
            {
                mode: 'ajax',
                namespace: 'API3',
                config: {
                    url: '/api3.json'
                },
                requiredParams: ['API1', 'API2', 'API6']
            },
            {
                mode: 'ajax',
                namespace: 'API4',
                config: {
                    url: '/api4.json'
                },
                requiredParams: ['API2', 'API6']
            },
            {
                mode: 'ajax',
                namespace: 'API5',
                config: {}
            },
            {
                mode: 'ajax',
                namespace: 'API6',
                config: {},
                requiredParams: ['API5']
            }
        ]);

        expect(dataProvider.taskQueue).toEqual([['API1', 'API5'], ['API2', 'API6'], ['API3', 'API4']]);
    });

    it('repeat namespace deps kind 2', () => {
        let dataProvider = new DataProvider([
            {
                mode: 'ajax',
                namespace: 'API1',
                config: {
                    url: '/api1.json'
                }
            },
            {
                mode: 'ajax',
                namespace: 'API2',
                config: {
                    url: '/api2.json'
                },
                requiredParams: ['API1', 'API5']
            },
            {
                mode: 'ajax',
                namespace: 'API3',
                config: {
                    url: '/api3.json'
                },
                requiredParams: ['API1', 'API2', 'API6']
            },
            {
                mode: 'ajax',
                namespace: 'API4',
                config: {
                    url: '/api4.json'
                },
                requiredParams: ['API2', 'API6', 'API5', 'API3']
            },
            {
                mode: 'ajax',
                namespace: 'API5',
                config: {}
            },
            {
                mode: 'ajax',
                namespace: 'API6',
                config: {},
                requiredParams: ['API5']
            }
        ]);

        expect(dataProvider.taskQueue).toEqual([['API1', 'API5'], ['API2', 'API6'], ['API3'], ['API4']]);
    });

    it('circular deps', () => {
        expect(() => new DataProvider([
            {
                mode: 'ajax',
                namespace: 'API1',
                config: {
                    url: '/api1.json'
                }
            },
            {
                mode: 'ajax',
                namespace: 'API2',
                config: {
                    url: '/api2.json'
                },
                requiredParams: ['API1', 'API5']
            },
            {
                mode: 'ajax',
                namespace: 'API3',
                config: {
                    url: '/api3.json'
                },
                requiredParams: ['API1', 'API2', 'API6']
            },
            {
                mode: 'ajax',
                namespace: 'API4',
                config: {
                    url: '/api4.json'
                },
                requiredParams: ['API2', 'API6', 'API5', 'API3']
            },
            {
                mode: 'ajax',
                namespace: 'API5',
                config: {},
                requiredParams: ['API4']
            },
            {
                mode: 'ajax',
                namespace: 'API6',
                config: {},
                requiredParams: ['API5']
            }
        ])).toThrow('DataProvider: 发现循环依赖的dataProvider. API1->API2->API3->API4->API5->API2');
    });

    it('requiredParams', () => {
        return new Promise((resolve, reject) => {
            let config = {
                body: [
                    {
                        type: 'container',
                        model: 'demo',
                        data: {
                            strict: true,
                            customData: true,
                            customeObject: {
                                name: 1
                            }
                        },
                        dataProvider: [
                            {
                                mode: 'ajax',
                                namespace: 'first',
                                config: {
                                    url: '/demo/first',
                                    method: 'GET',
                                    data: {
                                        name: '1'
                                    }
                                }
                            },
                            {
                                mode: 'ajax',
                                namespace: 'second',
                                config: {
                                    url: '/demo/second',
                                    method: 'GET',
                                    data: {
                                        name: '2'
                                    }
                                },
                                requiredParams: ['first', 'customData']
                            },
                            {
                                mode: 'ajax',
                                namespace: 'third',
                                config: {
                                    url: '/demo/third',
                                    method: 'GET',
                                    data: {
                                        name: '3'
                                    }
                                },
                                requiredParams: ['lock']
                            },
                            {
                                mode: 'ajax',
                                namespace: 'fourth',
                                config: {
                                    url: '/demo/fourth',
                                    method: 'GET',
                                    data: {
                                        name: '4'
                                    }
                                },
                                requiredParams: ['lock', 'customeObject'],
                                strictRequired: '#ES{$data.strict}'
                            }
                        ],
                        children: [
                            {
                                type: 'input',
                                name: 'lock'
                            },
                            {
                                type: 'input',
                                name: 'strict'
                            }
                        ]
                    }
                ]
            };
            let test = new RCRETestUtil(config);
            let wrapper = test.wrapper;

            moxios.wait(async () => {
                let first = moxios.requests.get('GET', '/demo/first?name=1');

                await first.respondWith({
                    status: 200,
                    response: {
                        data: 'first response'
                    }
                });

                let second = moxios.requests.get('GET', '/demo/second?name=2');
                await second.respondWith({
                    status: 200,
                    response: {
                        data: 'second response'
                    }
                });

                let state = test.getState();

                expect(state.container.demo.first.data).toBe('first response');
                expect(state.container.demo.second.data).toBe('second response');

                let switchComponent = wrapper.find('RCREConnect(input)').at(0);
                setData(switchComponent, false);

                moxios.wait(async () => {
                    let third = moxios.requests.get('GET', '/demo/third?name=3');
                    await third.respondWith({
                        status: 200,
                        response: {
                            data: 'third response'
                        }
                    });

                    state = test.getState();

                    expect(state.container.demo.third.data).toBe('third response');

                    let fourth = moxios.requests.get('GET', '/demo/fourth?name=4');
                    expect(fourth).toBe(undefined);

                    let strict = wrapper.find('RCREConnect(input)').at(1);
                    setData(strict, false);

                    state = test.getState();
                    expect(state.container.demo.strict).toBe(false);

                    moxios.wait(async () => {
                        let readFourth = moxios.requests.get('GET', '/demo/fourth?name=4');
                        await readFourth.respondWith({
                            status: 200,
                            response: {
                                data: 'fourth response'
                            }
                        });

                        state = test.getState();
                        expect(state.container.demo.fourth.data).toBe('fourth response');

                        resolve();
                    });
                });
            });
        });
    });

    it('responseRewrite', () => {
        return new Promise((resolve, reject) => {
            let config = {
                body: [
                    {
                        type: 'container',
                        model: 'outer2',
                        dataProvider: [
                            {
                                mode: 'ajax',
                                namespace: 'first',
                                config: {
                                    url: '/demo/test',
                                    method: 'GET',
                                    data: {
                                        num: '1'
                                    }
                                },
                                responseRewrite: {
                                    name: '#ES{$output.name}'
                                }
                            }
                        ],
                        children: []
                    }
                ]
            };

            let test = new RCRETestUtil(config);
            let wrapper = test.wrapper;

            moxios.wait(async () => {
                let request = moxios.requests.mostRecent();
                expect(JSON.parse(request.config.data).num).toBe('1');

                await request.respondWith({
                    status: 200,
                    response: {
                        name: 'helloworld'
                    }
                });

                let state = test.getState();
                expect(state.container.outer2.first.name).toBe('helloworld');

                wrapper.unmount();
                resolve();
            });
        });
    });

    it('condition', () => {
        return new Promise((resolve, reject) => {
            let config = {
                body: [
                    {
                        type: 'container',
                        model: 'outer',
                        data: {
                            num: 1,
                            condition: false
                        },
                        dataProvider: [
                            {
                                mode: 'ajax',
                                namespace: 'first',
                                config: {
                                    url: '/test/demo',
                                    method: 'GET',
                                    data: {
                                        num: '#ES{$data.num}'
                                    }
                                },
                                condition: '#ES{$data.condition}'
                            }
                        ],
                        children: [
                            {
                                type: 'checkbox',
                                name: 'condition',
                                text: 'switch'
                            }
                        ]
                    }
                ]
            };

            let component = <JSONRender code={config}/>;
            let wrapper = mount(component);

            let checkbox = wrapper.find('RCREConnect(checkbox)');

            moxios.wait(async () => {
                let request = moxios.requests.mostRecent();

                expect(request).toBe(undefined);

                setData(checkbox, true);

                moxios.wait(async () => {
                    request = moxios.requests.mostRecent();
                    expect(JSON.parse(request.config.data).num).toBe(1);
                    await request.respondWith({
                        status: 200,
                        response: {
                            errno: 0,
                            errmsg: 'ok'
                        }
                    });

                    resolve();
                });
            });
        });
    });

    it('dataProvider', function () {
        return new Promise((resolve, reject) => {
            let config = {
                body: [{
                    type: 'container',
                    model: 'dataProviderTest',
                    data: {
                        username: 'andycall'
                    },
                    dataProvider: [{
                        mode: 'ajax',
                        namespace: 'firstRequest',
                        config: {
                            url: '/api/request',
                            method: 'GET',
                            data: {
                                username: '#ES{$data.username}'
                            }
                        }
                    }],
                    children: [
                        {
                            type: 'text',
                            text: '#ES{$data.firstRequest.password}'
                        }
                    ]
                }]
            };

            let test = new RCRETestUtil(config);
            let wrapper = test.wrapper;

            // 在这个回调内对接口进行mock
            moxios.wait(async function () {
                // 获取当前的请求
                let firstRequest = moxios.requests.mostRecent();
                // 获取请求的参数
                let requestData = JSON.parse(firstRequest.config.data);
                expect(requestData.username).toBe('andycall');

                // 构建请求返回, 这个是一个异步行为，使用await 进行处理
                await firstRequest.respondWith({
                    status: 200,
                    // 返回的值
                    response: {
                        password: '123456'
                    }
                });

                // 这个时候，state已经被dataProvider修改了
                let state = test.getState();
                expect(state.container.dataProviderTest.firstRequest.password).toBe('123456');

                // 组件的值也更新了
                let text = wrapper.find('RCREConnect(text)');
                expect(text.text()).toBe('123456');

                resolve();
            });

            // 直接在这里读取state时错误的，因为请求还没返回
            // let state = test.getState() // !!! WRONG !!!
        });
    });

    it('first namespace been required by others', () => {
        return new Promise((resolve, reject) => {
            let config = {
                body: [{
                    type: 'container',
                    model: 'demo',
                    dataProvider: [{
                        mode: 'ajax',
                        namespace: 'A',
                        config: {
                            url: '/api/mock/A',
                            method: 'GET',
                            data: {
                                name: '#ES{$data.B.name}'
                            }
                        },
                        requiredParams: ['B']
                    }, {
                        mode: 'ajax',
                        namespace: 'B',
                        config: {
                            url: '/api/mock/B',
                            method: 'GET'
                        }
                    }],
                    children: [
                        {
                            type: 'text',
                            text: 'helloworld'
                        }
                    ]
                }]
            };

            let test = new RCRETestUtil(config);
            test.setContainer('demo');

            moxios.wait(async () => {
                let B = moxios.requests.get('GET', '/api/mock/B');
                await B.respondWith({
                    status: 200,
                    response: {
                        name: 'A'
                    }
                });

                let A = moxios.requests.get('GET', '/api/mock/A?name=A');

                await A.respondWith({
                    status: 200,
                    response: {
                        name: 'B'
                    }
                });

                let state = test.getContainerState();
                expect(state.B.name).toBe('A');
                expect(state.A.name).toBe('B');

                resolve();
            });
        });
    });

    it('params dependence', () => {
        return new Promise(async (resolve, reject) => {
            let config = {
                body: [{
                    type: 'container',
                    model: 'deps',
                    dataProvider: [
                        {
                            mode: 'ajax',
                            namespace: 'first',
                            config: {
                                url: '/api/username',
                                method: 'GET'
                            }
                        },
                        {
                            mode: 'ajax',
                            namespace: 'second',
                            config: {
                                url: '/api/password',
                                method: 'GET',
                                data: {
                                    username: '#ES{$data.first.username}'
                                }
                            },
                            requiredParams: ['first']
                        },
                        {
                            mode: 'ajax',
                            namespace: 'p_first',
                            config: {
                                url: '/api2/username',
                                method: 'GET'
                            }
                        },
                        {
                            mode: 'ajax',
                            namespace: 'q_first',
                            config: {
                                url: '/api3/username',
                                method: 'GET'
                            }
                        },
                        {
                            mode: 'ajax',
                            namespace: 'p_second',
                            config: {
                                url: '/api2/password',
                                method: 'GET',
                                data: {
                                    username: '#ES{$data.p_first.username}'
                                }
                            },
                            requiredParams: ['p_first']
                        }
                    ],
                    children: [
                        {
                            type: 'text',
                            text: '#ES{$data.first.username}'
                        },
                        {
                            type: 'text',
                            text: '#ES{$data.second.password}'
                        }
                    ]
                }]
            };
            let test = new RCRETestUtil(config);

            moxios.wait(async () => {
                let usernameA = moxios.requests.get('GET', '/api/username');
                let usernameB = moxios.requests.get('GET', '/api2/username');
                let usernameC = moxios.requests.get('GET', '/api3/username');

                await Promise.all([
                    usernameA.respondWith({
                        status: 200,
                        response: {
                            username: 'A'
                        }
                    }),
                    usernameB.respondWith({
                        status: 200,
                        response: {
                            username: 'B'
                        }
                    }),
                    usernameC.respondWith({
                        status: 200,
                        response: {
                            username: 'C'
                        }
                    })
                ]);

                let state = test.getContainerState('deps');
                expect(state.$loading).toBe(true);

                moxios.wait(async () => {
                    let passwordA = moxios.requests.get('GET', '/api/password?username=A');
                    let passwordB = moxios.requests.get('GET', '/api2/password?username=B');

                    await Promise.all([
                        passwordA.respondWith({
                            status: 200,
                            response: {
                                password: '123'
                            }
                        }),
                        passwordB.respondWith({
                            status: 200,
                            response: {
                                password: '456'
                            }
                        })
                    ]);

                    state = test.getContainerState('deps');

                    expect(state.$loading).toBe(false);
                    expect(state.first).toEqual({
                        username: 'A'
                    });
                    expect(state.second).toEqual({
                        password: '123'
                    });
                    expect(state.p_first).toEqual({
                        username: 'B'
                    });
                    expect(state.q_first).toEqual({
                        username: 'C'
                    });
                    expect(state.p_second).toEqual({
                        password: '456'
                    });

                    resolve();
                });

            });
        });
    });

    it('dataProvider will update $loading property value', () => {
        return new Promise((resolve, reject) => {
            let config = {
                body: [{
                    type: 'container',
                    model: 'test',
                    dataProvider: [{
                        mode: 'ajax',
                        namespace: 'PageConfig',
                        config: {
                            url: '/api/data',
                            method: 'GET'
                        }
                    }],
                    children: [
                        {
                            type: 'input',
                            name: 'username'
                        }
                    ]
                }]
            };

            let util = new RCRETestUtil(config);
            let state = util.getState();

            expect(state.container.test.$loading).toBe(true);

            moxios.wait(async () => {
                let request = moxios.requests.mostRecent();

                await request.respondWith({
                    status: 200,
                    response: {
                        username: 'helloworld'
                    }
                });

                let data = util.getContainerState('test');

                expect(data.$loading).toBe(false);

                resolve();
            });
        });
    });

    it('strictRequired', () => {
        return new Promise(async (resolve, reject) => {
            let config = {
                body: [{
                    type: 'container',
                    model: 'test',
                    dataProvider: [{
                        mode: 'ajax',
                        namespace: 'PageConfig',
                        config: {
                            url: '/api/data',
                            method: 'GET'
                        },
                        requiredParams: ['username'],
                        strictRequired: '#ES{$data.strict}'
                    }, {
                        mode: 'ajax',
                        namespace: 'PageConfig2',
                        config: {
                            url: '/api/data',
                            method: 'GET'
                        },
                        requiredParams: ['username'],
                        strictRequired: '#ES{$data.loose}'
                    }],
                    children: [
                        {
                            type: 'input',
                            name: 'username'
                        },
                        {
                            type: 'checkbox',
                            name: 'strict'
                        },
                        {
                            type: 'checkbox',
                            name: 'loose'
                        }
                    ]
                }]
            };

            let util = new RCRETestUtil(config);
            util.setContainer('test');

            let username = util.getComponentByName('username');
            let strict = util.getComponentByName('strict');
            let loose = util.getComponentByName('loose');

            util.setData(strict, true);
            await util.simulate(strict, 'onClick', {
                value: true
            });
            util.setData(loose, false);
            await util.simulate(loose, 'onClick', {
                value: false
            });
            util.setData(username, '');
            await util.simulate(username, 'onChange', {
                value: ''
            });

            moxios.wait(async () => {
                let request = moxios.requests.mostRecent();
                await request.respondWith({
                    status: 200,
                    response: {
                        data: 'test'
                    }
                });
                expect(util.getContainerState().PageConfig).toBe(undefined);
                expect(util.getContainerState().PageConfig2).toEqual({data: 'test'});

                resolve();
            });
        });
    });
});

describe('Real Request DataProvider', () => {
    it('multiple dataProvider request', async () => {
        const LINE_CHART = 'lineChart';
        const BAR_CHART = 'barChart';
        const PIE_CHART = 'pieChart';

        let config: PageConfig<any> = {
            body: [{
                type: CoreKind.container,
                model: 'test',
                dataProvider: [{
                    mode: 'ajax',
                    namespace: LINE_CHART,
                    config: {
                        url: 'http://localhost:8844/static/piechart.json',
                        method: 'GET',
                        data: {}
                    }
                }, {
                    mode: 'ajax',
                    namespace: BAR_CHART,
                    config: {
                        url: 'http://localhost:8844/static/barchart.json',
                        method: 'GET',
                        data: {}
                    }
                }, {
                    mode: 'ajax',
                    namespace: PIE_CHART,
                    config: {
                        url: 'http://localhost:8844/static/linechart.json',
                        method: 'GET',
                        data: {}
                    }
                }],
                children: [
                    {
                        type: CoreKind.text,
                        text: `#ES{$data.${PIE_CHART}}`
                    }
                ]
            }]
        };

        let test = new RCRETestUtil(config);

        await test.waitForDataProviderComplete();
        let state = test.getState();
        let testState = state.container.test;

        expect(typeof testState.lineChart).toBe('object');
        expect(typeof testState.barChart).toBe('object');
        expect(typeof testState.pieChart).toBe('object');
    });

    it('should work with dataProvider deps', async () => {
        let config = {
            body: [
                {
                    type: 'container',
                    model: 'dataProviderDeps',
                    dataProvider: [{
                        mode: 'ajax',
                        namespace: 'first',
                        config: {
                            url: 'http://localhost:8844/static/linechart.json',
                            method: 'GET'
                        },
                        requiredParams: []
                    }, {
                        mode: 'ajax',
                        namespace: 'second',
                        config: {
                            url: 'http://localhost:8844/static/barchart.json',
                            method: 'GET',
                            data: {
                                username: '#ES{$data.username}'
                            }
                        },
                        requiredParams: ['username', 'first']
                    }],
                    children: [
                        {
                            type: 'input',
                            name: 'username'
                        }
                    ]
                }
            ]
        };

        let test = new RCRETestUtil(config);

        test.setContainer('dataProviderDeps');
        await test.waitForDataProviderComplete();

        let state = test.getContainerState();
        expect(state.$loading).toBe(false);

        let username = test.getComponentByName('username');
        test.setData(username, 'helloworld');

        state = test.getContainerState();

        await test.waitForDataProviderComplete();
        state = test.getContainerState();

        expect(state.second.status).toBe(0);
        expect(state.second.msg).toBe('');
    });
});

describe('REQUEST CACHE', function () {
    beforeAll(() => {
        window.__RCRE_TEST_REQUEST_CACHE__ = true;
    });

    afterAll(() => {
        window.__RCRE_TEST_REQUEST_CACHE__ = false;
    });

    it('hit cache with two same request', async () => {
        let config = {
            body: [{
                type: 'container',
                model: 'demo',
                dataProvider: [{
                    mode: 'ajax',
                    namespace: 'A',
                    config: {
                        url: 'http://localhost:8844/static/linechart.json',
                        method: 'GET',
                        data: {
                            name: '1'
                        }
                    }
                }],
                children: [
                    {
                        type: 'text',
                        text: 'helloworld'
                    }
                ]
            }]
        };

        let test = new RCRETestUtil(config);
        test.setContainer('demo');
        await test.waitForDataProviderComplete();

        let anotherConfig = {
            body: [{
                type: 'container',
                model: 'demo2',
                dataProvider: [{
                    mode: 'ajax',
                    namespace: 'B',
                    config: {
                        url: 'http://localhost:8844/static/linechart.json',
                        method: 'GET',
                        data: {
                            name: '1'
                        }
                    }
                }],
                children: [{
                    type: 'text',
                    text: 'helloworld'
                }]
            }]
        };

        let test2 = new RCRETestUtil(anotherConfig);
        test2.setContainer('demo2');

        await test.waitForDataProviderComplete();
    });
});