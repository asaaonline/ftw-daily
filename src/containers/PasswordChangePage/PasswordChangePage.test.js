import React from 'react';
import { renderShallow } from '../../util/test-helpers';
import { PasswordChangePageComponent } from './PasswordChangePage';

const noop = () => null;

describe('PasswordChangePage', () => {
  it('matches snapshot', () => {
    const tree = renderShallow(
      <PasswordChangePageComponent
        params={{ displayName: 'my-shop' }}
        history={{ push: noop }}
        location={{ search: '' }}
        scrollingDisabled={false}
        authInProgress={false}
        currentUserHasListings={false}
        isAuthenticated={false}
        onChange={noop}
        onLogout={noop}
        onManageDisableScrolling={noop}
        sendVerificationEmailInProgress={false}
        onResendVerificationEmail={noop}
        onSubmitChangePassword={noop}
        changePasswordInProgress={false}
        passwordChanged={false}
      />
    );
    expect(tree).toMatchSnapshot();
  });
});