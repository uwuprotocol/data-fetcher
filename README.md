# Data Fetcher
A microservice that gathers insights on UWU Protocol and stores it in a MonogoDB database.

## Development Notice
This project is currently in early access. Please note that the `data.usm.feeY` and `system.holders.uwu` data points contain hardcoded values. These data points will be updated to reflect live data in the near future.

## Setup
1. Clone the repository: 
    ```
    git clone https://github.com/uwuprotocol/data-fetcher.git
    ```

2. Navigate into the directory: 
    ```
    cd data-fetcher
    ```

3. Install the dependencies: 
    ```
    npm install
    ```

4. Create a `.env` file in the root directory and fill in the necessary variables. An example file `.env.example` is provided.

## Usage
1. Navigate into the directory: 
    ```
    cd data-fetcher
    ```
    
2. Run the Data Fetcher:
    ```
    npm start
    ```

## Environment Variables
The following environment variables are needed in the `.env` file:

- `RPC_URL`: The URL of the Stacks Blockchain API instance.

- `MONGODB_CONNECTION_STRING`: The connection string for the MongoDB database.

## Discussion
Please join us on [Discord](http://chat.uwu.cash) for discussions or report any issues you encounter on this Github repository or on our [Canny](https://uwu.canny.io).

## Code of Conduct
Please read our [Code of Conduct](CODE_OF_CONDUCT.md) to understand our community standards and expectations.

## License
This repository is licenesed under the GNU General Public License v3.0. See [LICENSE](LICENSE) for more information.
