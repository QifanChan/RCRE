import {runTimeType} from '../../../types';
import {CustomerParams} from '../index';
import {compileExpressionString, isExpression, parseExpressionString} from '../../util/vm';
import {request} from '../../Service/api';
import * as _ from 'lodash';
import {containerActionCreators} from '../../Container/action';
import {AxiosResponse} from 'axios';

export interface SubmitCustomerExecConfig {
    /**
     * 提交的地址
     */
    url: string;

    /**
     * 提交的方式
     */
    method: string;

    /**
     * 提交的数据
     */
    data: Object | string;

    /**
     * 返回值验证
     */
    retCheckPattern?: string;

    /**
     * 返回值映射
     */
    retMapping?: Object;

    /**
     * 提示的错误信息
     */
    retErrorMsg?: string;
    retErrMsg?: string;

    /**
     * 使用application/x-www-form-urlencoded格式进行提交
     */
    formSubmit?: boolean;

    /**
     * 将提交的值写入到当前的数据模型
     */
    export?: Object;

    /**
     * 返回值映射的字段
     */
    namespace?: string;
}

function handleError(error: Error, response: AxiosResponse, config: SubmitCustomerExecConfig, runTime: runTimeType) {
    let data = {};

    // axios response data
    if (response && response.data) {
        data = response.data;
    }

    let errmsg = config.retErrorMsg || config.retErrMsg;
    if (errmsg && isExpression(errmsg)) {
        errmsg = parseExpressionString(errmsg, {
            ...runTime,
            $output: data
        });
    }

    errmsg = errmsg || error.message;

    throw new Error(errmsg);
}

export async function submitCustomer(config: SubmitCustomerExecConfig, params: CustomerParams) {
    if (!config.url) {
        throw new Error('URL is Required for submit request');
    }

    if (!config.method) {
        config.method = 'GET';
    }

    let {
        runTime
    } = params;

    config = compileExpressionString(config, runTime, ['retCheckPattern', 'retErrorMsg', 'retErrMsg']);

    let data = config.data;

    if (_.isPlainObject(data)) {
        config.data = compileExpressionString(data, runTime);
    } else if (isExpression(data)) {
        config.data = parseExpressionString(data, runTime);
    }

    let proxyUrl = null;

    if (runTime.$global) {
        proxyUrl = runTime.$global.proxy;
    }

    // 在某些特殊场景(E2E TEST)下，不提交，直接返回待提交的数据
    if (params.options && params.options.preventSubmit) {
        return config;
    }

    params.rcreContext.store.dispatch(
        containerActionCreators.setData({
            name: '$loading',
            value: true
        }, params.model, {
            container: params.containerContext,
            iterator: params.iteratorContext,
            rcre: params.rcreContext
        })
    );

    let ret;
    try {
        ret = await request(config.url, config, proxyUrl);
    } catch (e) {
        let errResponse = e.response;
        params.rcreContext.store.dispatch(
            containerActionCreators.setMultiData([{
                name: '$loading',
                value: false
            }, {
                name: '$error',
                value: e
            }], params.model, {
                container: params.containerContext,
                iterator: params.iteratorContext,
                rcre: params.rcreContext
            })
        );

        handleError(e, errResponse, config, runTime);
        return;
    }

    if (ret.status !== 200) {
        let error = new Error('Request Failed' + ret.statusText);
        params.rcreContext.store.dispatch(
            containerActionCreators.setMultiData([{
                name: '$loading',
                value: true
            }, {
                name: '$error',
                value: error
            }], params.model, {
                container: params.containerContext,
                iterator: params.iteratorContext,
                rcre: params.rcreContext
            })
        );
        throw error;
    }

    if (config.retCheckPattern) {
        let isValid = parseExpressionString(config.retCheckPattern, {
            ...runTime,
            $output: ret.data
        });

        if (!isValid) {
            params.rcreContext.store.dispatch(
                containerActionCreators.setData({
                    name: '$loading',
                    value: false
                }, params.model, {
                    container: params.containerContext,
                    iterator: params.iteratorContext,
                    rcre: params.rcreContext
                })
            );
            handleError(new Error(), ret, config, runTime);
            return;
        }
    }

    let innerRunTime = {
        ...runTime,
        $output: ret.data
    };

    if (_.isPlainObject(config.retMapping)) {
        ret.data = compileExpressionString(config.retMapping, innerRunTime)!;
    }

    if (config.export) {
        let exportValue = compileExpressionString(config.export, innerRunTime);
        let keys = Object.keys(exportValue);
        let multiItems = keys.map(key => ({
            name: key,
            value: exportValue[key]
        })).concat([{
            name: '$loading',
            value: false
        }, {
            name: '$error',
            value: null
        }]);

        params.rcreContext.store.dispatch(
            containerActionCreators.setMultiData(multiItems, params.model, {
                container: params.containerContext,
                iterator: params.iteratorContext,
                rcre: params.rcreContext
            })
        );
    }

    return ret.data;
}