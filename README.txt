net.js -- Simple networking for HTML games


Features
    - Modular, extensible client-server RPC system
    - Player management
    - Chat


Still to do
    - Provide library as one standalone file
    - Fast binary protocol


Running the test app

    1. Install dependencies
        npm install

    2. Start lobby
        node lobby.js 8002

    3. Start p2p broker
        (install js-platform/p2p from github and start it)

    4. Start test server
        npm install -g http-server
        http-server -p 8001 -c-1

    5. Run test
        Open localhost:8001/main.html


Adding net.js to your project

    Couple of rough edges here. Net.js is a RequireJS module, and I haven't
    gotten around to compiling a stand-alone version yet, so you'll have to use
    RequireJS to load it.

    <script src='p2p-client.js'></script>
    <script src='require.js'></script>
    <script>
        require.config({
            // tell RequireJS where net.js is here
        });
        require(['net'], function(net) {
            // Use net here
        });
    </script>

    Ideally we could include p2p-client.js as a dependency, but I haven't
    figured out how to successfully feed it to RequireJS yet.


Tutorial

    Have a read through src/test.js -- it's a heavily commented example game
    designed to serve as a tutorial.


API reference

    net.Lobby(brokerUrl) -> lobby

        The Lobby module communicates with the lobby server (server/lobby.js)
        to implement server discovery.

        lobby.advertise({ id: string?, data: object })

            Tell the lobby about a new game. If id is omitted, the remote
            lobby will generate one for you.

            If id matches an existing game, this updates that game instead
            of registering a new one.

            Games should be updated once per minute so the server doesn't
            prune them.

        lobby.poll(cb) -> cb({date:number, ip:string, data:object}*)

            Returns a list of active games.
                date:  Timestamp of when the game was created, as returned
                       by Date.now()
                ip:    Hosts's IP address
                data:  Custom data given to lobby.advertise()


    net.RPCTable() -> rpcs

        Create and return an RPC table. You'll most likely just want to use
        the RPC table inside your node object at node.rpcTable.

        rpcs.add(fn)

            Add a function to the table. When a remote RPC request is
            received, the function will be called as fn(conn, ...) where
            ... represents the arguments given by the caller, and conn is
            the connection to the caller or null if this is a local call.

        rpcs.call(meta, msg)

            Decode an RPC message and call the appropriate RPC in the table,
            prepending the given meta object to the received arguments.


    net.Node(brokerUrl, role, onReady)

        A node is your local endpoint in the network. It's either a client
        or a server. Each network has one server and any number of clients.

        You will most likely only want to instantiate one Node object in
        your program.

        Most of the functionality in the Node module has to do with managing
        remote procedure calls (RPCs). Higher-level functionality is included
        in the other modules, most of which take a Node as an argument.

        Arguments:

            brokerUrl: URL where p2p host is running. Server is available on
                       github at js-platform/p2p

            role: 'client' or 'server'

            onReady: called with node object when ready.

            route: Name of the underlying route. The broker server assigns
                   a route to the node before onReady is called. Anyone with the
                   route name can connect to this node via the broker.

        Properties common to client and server nodes:

            node.local(rpc, ...)

                Call a named RPC on the local machine.

            node.remote(recipient, rpc, ...)

                Queue up an RPC call to be sent to the given recipient, which
                should be a Peer or Connection object.

            node.server(rpc, ...)

                Arrange for the RPC to be called on the server. If this is
                the local node, call it locally immediately. Otherwise, queue
                it to be sent to the server.

            node.process()

                Send all queued RPCs. This should be called at a regular
                rate. Common update rates for action games are typically
                around 10Hz.

            node.role

                'client' or 'server'.

            node.onstatechange(state)

                Called when connecting as a client, and again when connection is
                successful.


        Properties unique to server nodes:

            node.listen()

                Start listening for client connections.

            node.close()

                Stop listening for client connections.

            node.broadcast(...)

                Call the specified RPC remotely for each remote player, and
                locally for each local player. Note: there can only be one
                local player.

            node.ondisconnect(clientConnection)

                Called when a client disconnects.


        Properties unique to client nodes:

            node.connect(route, cb)

                Connect to the given route. Call cb() on success, or cb(e)
                on error.

            node.close()

                Disconnect.


    net.Players(node, numSlots) -> players

        Adds player management to a node. Instead of just bare connections,
        you get a list of player objects which can have names, scores and
        any other data you like.

        players.login(credentials)

            Called when a client tries to log in. Return an object of
            custom player data on success, or null on failure. The
            default implementation just uses the credentials object
            itself. Reassign this function to customize it.

        players.add(player)

            Add a player and notify all clients. Player objects are
            expected to have these fields:

                connection: Optional remote connection
                data:       Game-specific data

            You'll probably want to use this to add local players, and
            let remote players get added automatically using the login
            system.

        players.remove(player)

            Remove a player and notify all clients.

        players.all

            List of all player slots, Each slot contains either a player
            or null.

        players.forEach(cb)

            Convenience function to iterate over occupied player slots. Calls
            cb(player, id) for each player in the game.


    net.Chat(node) -> chat

        Adds simple chat capabilities to a node.

        chat.onmessage(from, message)

            User-assignable callback. Called when a message is received.
            'from' is the player.data property of the sender.

        chat.send: RPC (s) (message)

            Call to send a message.
