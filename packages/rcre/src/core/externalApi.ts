import {Store} from 'redux';
import {containerActionCreators} from './Container/action';
import {getContainerStateHistory} from '../data/history';

/**
 * 回滚container设置的state
 * @param store
 */
export function undoRCREContainerState(store: Store<any>) {
    store.dispatch(containerActionCreators.undoState());
}

/**
 *
 * @param store
 */
export function forwardRCREContainerState(store: Store<any>) {
    store.dispatch(containerActionCreators.forwardState());
}

export {
    getContainerStateHistory
};