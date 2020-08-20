import React, { useState } from 'react';
import GameView from './game/GameView';
import { Switch, Route, BrowserRouter, Redirect } from 'react-router-dom';
import { AppContext } from './AppContext';

const params = new URLSearchParams(window.location.search);

const userId = params.get('userId');

function App() {
    return (
        <AppContext.Provider value={{ userId }}>
            <BrowserRouter>
                <Switch>
                    <Route path="/game" component={GameView} />
                    <Route path="/empty" render={() => 'This page is empty'} />
                    <Redirect to="/empty" />
                </Switch>
            </BrowserRouter>
        </AppContext.Provider>
    );
}

export default App;
