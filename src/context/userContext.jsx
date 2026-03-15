/**
 * UserContext provides a React Context for managing user-related state across the application.
 *
 * @module UserContext
 */

/**
 * UserProvider is the Context Provider component for UserContext.
 * Wrap your component tree with this to provide user state to descendants.
 *
 * @type {React.Provider}
 */

/**
 * UserConsumer is the Context Consumer component for UserContext.
 * Use this to access user state in class components or outside hooks.
 *
 * @type {React.Consumer}
 */
import React, { Component } from "react";

const UserContext = React.createContext();

const UserProvider = UserContext.Provider;
const UserConsumer = UserContext.Consumer;

export { UserConsumer, UserProvider };
export default UserContext;
