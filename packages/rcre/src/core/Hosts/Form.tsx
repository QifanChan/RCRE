import React from 'react';
import {BasicConfig, BasicProps} from '../../types';
import {FormProps, RCREForm} from '../Form/Form';
import {componentLoader} from '../util/componentLoader';
import {createChild} from '../util/createChild';
import {FormContext} from '../context';

function JSONForm(props: FormProps & BasicProps) {
    let children = (props.children || []).map((child: BasicConfig, index: number) => {
        return createChild(child, {
            key: index
        });
    });

    return (
        <RCREForm {...props}>
            <FormContext.Consumer>
                {context => {
                    return (
                        <form
                            onSubmit={event => {
                                context.$handleSubmit();
                            }}
                        >
                            {children}
                        </form>
                    );
                }}
            </FormContext.Consumer>

        </RCREForm>
    );
}

componentLoader.addComponent('form', JSONForm);