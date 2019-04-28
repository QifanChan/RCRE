import {ContainerNode, syncExportContainerState} from '../../../../packages/rcre/src/core/Service/ContainerDepGraph';

describe('ContainerDepGraph', () => {
    it('syncExportContainerState.export', () => {
        /**
         *       root
         *       / \
         *      A   B
         *     /
         *    C
         */
        let root = new ContainerNode('root');

        let A = new ContainerNode('A', {}, {
            name: '#ES{$data.name} + A'
        });
        let B = new ContainerNode('B', {}, {
            name: '#ES{$data.name} + B'
        });
        let C = new ContainerNode('C', {}, {
            name: '#ES{$data.name} + C'
        });

        root.addChild(A);
        root.addChild(B);
        A.addChild(C);

        let state: any = {
            C: {
                name: 'andycall'
            }
        };

        let affectNode: ContainerNode[] = [];
        // @ts-ignore
        state = syncExportContainerState(state, affectNode, {
            // @ts-ignore
            container: {},
            // @ts-ignore
            rcre: {},
            // @ts-ignore
            iterator: {},
            // @ts-ignore
            form: {}
        }, C);

        expect(affectNode.map(node => node.model).join(',')).toBe('C,A,root');

        expect(state.C.name).toBe('andycall');
        expect(state.A.name).toBe('andycall + C');
        expect(state.root.name).toBe('andycall + C + A');
    });

    it('syncExportContainerState.bind', () => {
        /**
         *       root
         *       / \
         *      A   B
         *     /
         *    C
         */
        let root = new ContainerNode('root');

        let A = new ContainerNode('A', undefined, undefined, [{
            child: 'name',
            parent: 'name'
        }]);
        let B = new ContainerNode('B', undefined, undefined, [{
            child: 'name',
            parent: 'name'
        }]);
        let C = new ContainerNode('C', undefined, undefined, [{
            child: 'name',
            parent: 'name'
        }]);

        root.addChild(A);
        root.addChild(B);
        A.addChild(C);

        let state: any = {
            C: {
                name: 'andycall'
            }
        };

        let affectNode: ContainerNode[] = [];
        // @ts-ignore
        state = syncExportContainerState(state, affectNode, {
            // @ts-ignore
            container: {},
            // @ts-ignore
            rcre: {},
            // @ts-ignore
            iterator: {},
            // @ts-ignore
            form: {}
        }, C);

        expect(state.C.name).toBe('andycall');
        expect(state.A.name).toBe('andycall');
        expect(state.root.name).toBe('andycall');
    });
});