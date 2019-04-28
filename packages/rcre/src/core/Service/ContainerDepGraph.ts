import {BindItem, ContainerContextType, ContainerNodeOptions} from '../../types';
import {IContainerState} from '../Container/reducer';
import {isObjectLike, each, isPlainObject, get} from 'lodash';
import {RunTimeContextCollection} from '../context';
import {
    compileExpressionString,
    evalInContext,
    isExpression,
    parseExpressionString
} from '../util/vm';
import {setWith, deleteWith, getRuntimeContext, injectFilterIntoContext, combineKeys} from '../util/util';
import {parseExpressionToken} from 'rcre-runtime';

/**
 * 是否是不会被同步到父级的值
 * @param value
 * @returns {boolean}
 */
function isUnExportValue(value: any) {
    return value === null ||
        value === undefined;
}

export class ContainerNode {
    public model: string;
    public parent: ContainerNode | undefined;
    public children: ContainerNode[];
    public props?: Object;
    public export?: Object | string;
    public bind?: BindItem[];
    public options: ContainerNodeOptions;

    constructor(
        model: string,
        props?: Object,
        _export?: Object,
        bind?: BindItem[],
        options: ContainerNodeOptions = {}
    ) {
        this.model = model;
        this.children = [];
        this.export = _export;
        this.props = props;
        this.bind = bind;
        this.options = options;
    }

    public addChild(child: ContainerNode) {
        if (child.parent !== this) {
            child.parent = this;
        }

        this.children.push(child);
    }

    public removeChild(child: ContainerNode) {
        let index = this.children.indexOf(child);

        if (index >= 0) {
            this.children.splice(index, 1);
        }
    }
}

/**
 * 自动根据Container组件的export或者bind属性。来同步数据到state。
 * @param {IContainerState} state
 * @param {ContainerNode[]} affectNode
 * @param {ContainerNode} node
 * @param {Object} context
 */
export function syncExportContainerState(
    state: IContainerState,
    affectNode: ContainerNode[],
    context: RunTimeContextCollection,
    node?: ContainerNode
) {
    if (!node) {
        return state;
    }

    if (affectNode.indexOf(node) === -1) {
        affectNode.push(node);
    }

    let exportConfig = node.export;
    let bindConfig = node.bind;

    if (!exportConfig && !bindConfig) {
        return state;
    }

    if (exportConfig && bindConfig) {
        console.error('bind和export功能不建议一起使用，会有值覆盖的风险');
        return state;
    }

    let model = node.model;
    let $data = state[model];
    let runTime = getRuntimeContext({
        $data: $data
    } as ContainerContextType, context.rcre, {
        iteratorContext: context.iterator
    });

    let parentNode = node.parent;

    if (parentNode) {
        let parentModel = parentNode.model;
        if (!state[parentModel]) {
            state[parentModel] = {};
        }

        if (isObjectLike(exportConfig)) {
            let exportValue = compileExpressionString(exportConfig, runTime) as Object;
            each(exportValue, (value, key) => {
                if (isUnExportValue(value) && node.options.noNilToParent) {
                    return;
                }
                state = setWith(state, combineKeys(parentModel, key), value);
            });
        } else if (isExpression(exportConfig)) {
            let exportValue = parseExpressionString(exportConfig, runTime);
            if (isObjectLike(exportValue)) {
                each(exportValue, (value, key) => {
                    if (isUnExportValue(value) && node.options.noNilToParent) {
                        return;
                    }
                    state = setWith(state, combineKeys(parentModel, key), value);
                });
            }
        } else if (bindConfig instanceof Array) {
            bindConfig.forEach(bind => {
                if (!bind.parent || !bind.child) {
                    console.error('设置Bind属性的时候，parent和child都是必须选项');
                    return;
                }

                let childValue = state[model][bind.child];

                if (isUnExportValue(childValue) && node.options.noNilToParent) {
                    return;
                }

                state = setWith(state, combineKeys(parentModel, bind.parent), childValue);
            });
        } else if (exportConfig === 'all') {
            Object.keys(state[model]).forEach(key => {
                state = setWith(state, combineKeys(parentModel, key), state[model][key]);
            });
        }

        state = syncExportContainerState(state, affectNode, context, parentNode);
    }

    return state;
}

export function syncPropsContainerState(state: IContainerState, context: RunTimeContextCollection, node?: ContainerNode) {
    if (!node) {
        return state;
    }

    if (node.children.length > 0) {
        let model = node.model;
        let $data = state[model];

        for (let child of node.children) {
            if (!child.props && !child.bind) {
                continue;
            }
            let inheritValue = {};
            let childModel = child.model;
            let child$data = state[childModel];
            let childRunTime = getRuntimeContext({
                $data: child$data,
                $parent: $data
            } as ContainerContextType, context.rcre, {
                iteratorContext: context.iterator
            });

            let props = child.props;
            let bindList = child.bind;

            if (typeof props === 'string' || typeof props === 'function') {
                if (props === 'inherit') {
                    inheritValue = $data;
                } else if (isExpression(props)) {
                    inheritValue = parseExpressionString(props, childRunTime);
                }
            } else if (typeof props === 'object') {
                each(props, (expression: any, name) => {
                    if (typeof expression === 'string' || typeof expression === 'function') {
                        if (!isExpression(expression)) {
                            inheritValue[name] = expression;
                            return;
                        }

                        inheritValue[name] = parseExpressionString(expression, childRunTime);
                    } else if (typeof expression === 'object') {
                        let prop = expression.prop;
                        let priority = expression.priority;

                        // priority === child and nothing//
                        let result = parseExpressionString(prop, childRunTime);

                        // 字级优先，而字级又没有值的时候，就给个初始值
                        if (priority === 'parent') {
                            console.warn('priority === parent is no longer supported');
                        }

                        inheritValue = setWith(inheritValue, name, result);
                    } else {
                        inheritValue[name] = expression;
                    }
                });
            } else if (bindList instanceof Array) {
                bindList.forEach(bind => {
                    if (!bind.parent || !bind.child) {
                        console.error('设置Bind属性的时候，parent和child都是必须选项');
                        return;
                    }

                    let parentValue = get(state[model], bind.parent);
                    state = setWith(state, combineKeys(childModel, bind.child), parentValue);
                });
            }

            if (!state[childModel]) {
                state = setWith(state, childModel, {});
            }

            each(inheritValue, (value, key) => {
                state = setWith(state, combineKeys(childModel, key), value);
            });

            state = syncPropsContainerState(state, context, child);
        }
    }

    return state;
}

/**
 * 同步删除当前container中的字段
 *
 * @param {IContainerState} state
 * @param {string} key
 * @param {Object} context
 * @param {ContainerNode} node
 * @returns {any}
 */
export function syncDeleteContainerState(state: IContainerState, context: RunTimeContextCollection, node?: ContainerNode, key?: string) {
    if (!node) {
        return state;
    }

    let exportConfig = node.export;
    let bindConfig = node.bind;

    if (!exportConfig && !bindConfig) {
        return state;
    }

    let model = node.model;
    let parentNode = node.parent;

    if (parentNode) {
        let parentModel = parentNode.model;

        if (exportConfig) {
            if (typeof exportConfig === 'string' || typeof exportConfig === 'function') {
                let runTime = getRuntimeContext({
                    $data: state[model]
                } as ContainerContextType, context.rcre, {
                    iteratorContext: context.iterator
                });
                let ret = parseExpressionString(exportConfig, runTime);

                if (!isPlainObject(ret)) {
                    console.warn('使用字符串的export功能，返回值必须是一个普通对象');
                    return state;
                }

                if (key && !node.options.forceSyncDelete) {
                    console.warn('使用字符串的export配置将无法执行按照key进行删除的操作，请使用对象作为export的值，让RCRE能够获取到具体要删除的key');
                    return state;
                }

                Object.keys(ret).map((depKey) => {
                    state = deleteWith(state, combineKeys(parentModel, depKey));
                });
            } else if (typeof exportConfig === 'object' && !Array.isArray(exportConfig)) {
                let depKey = {};
                each(exportConfig, (expression: any, name) => {
                    if (!isExpression(expression)) {
                        return;
                    }

                    let runTime = getRuntimeContext({
                        $data: state[model]
                    } as ContainerContextType, context.rcre, {
                        iteratorContext: context.iterator
                    });

                    let proxyHandler = {
                        get(obj: any, prop: string) {
                            depKey[name] = prop;
                            return obj[prop];
                        }
                    };

                    runTime.$data = new Proxy(runTime.$data, proxyHandler);

                    injectFilterIntoContext(runTime);

                    if (typeof expression === 'string') {
                        let tokens = parseExpressionToken(expression);

                        tokens.forEach(token => {
                            if (!token.token) {
                                return;
                            }

                            try {
                                evalInContext(token.token, runTime);
                            } catch (e) {
                                console.error('RCRE CORE: runTime error when collect delete properties; token=' +
                                    token.token + '\n errmsg: ' + e.message + '\n');
                                console.groupCollapsed('runTime: ');
                                console.error(runTime);
                                console.groupEnd();
                            }
                        });
                    } else if (typeof expression === 'function') {
                        expression(runTime);
                    }

                });

                if (key) {
                    each(depKey, (dep, depName) => {
                        if (dep === key) {
                            state = deleteWith(state, combineKeys(parentModel, depName));
                        }
                    });
                } else {
                    each(depKey, (dep, depName) => {
                        state = deleteWith(state, combineKeys(parentModel, depName));
                    });
                }
            }
            state = syncDeleteContainerState(state, context, parentNode, key);
        }

        return state;
    }

    return state;
}
