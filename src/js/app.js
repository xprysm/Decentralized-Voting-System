const Web3 = require('web3');
const contract = require('@truffle/contract');
const votingArtifacts = require('../../build/contracts/Voting.json');
const VotingContract = contract(votingArtifacts);

window.App = {
  account: null,

  eventStart: async function () {
    console.log("🚀 App starting...");

    if (window.ethereum) {
      console.log("🦊 MetaMask detected");

      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const web3 = new Web3(window.ethereum);
      VotingContract.setProvider(window.ethereum);

      const accounts = await web3.eth.getAccounts();
      App.account = accounts[0];
      console.log("👤 Connected account:", App.account);

      VotingContract.defaults({ from: App.account, gas: 6654755 });

      try {
        const instance = await VotingContract.deployed();
        console.log("📦 Contract deployed at:", instance.address);

        // 🔓 Make globally available for debugging
        window.instance = instance;
        window.VotingContract = VotingContract;

        $("#accountAddress").html("Your Account: " + App.account);

        const countCandidates = await instance.getCountCandidates();

        // Display current voting dates
        try {
          const result = await instance.getDates();
          const startDate = new Date(result[0] * 1000);
          const endDate = new Date(result[1] * 1000);
          $("#dates").text(`${startDate.toDateString()} - ${endDate.toDateString()}`);
        } catch (err) {
          console.error("❌ Failed to fetch dates:", err.message);
        }

        // Add candidate button
        $('#addCandidate').click(async function () {
          const name = $('#name').val();
          const party = $('#party').val();

          if (!name || !party) {
            alert("Please enter candidate name and party.");
            return;
          }

          try {
            await instance.addCandidate(name, party, { from: App.account });
            console.log(`✅ Candidate '${name}' added.`);
            window.location.reload();
          } catch (err) {
            console.error("❌ Failed to add candidate:", err.message);
          }
        });

        // Set dates button
        $('#addDate').click(async function () {
          const startDate = Date.parse(document.getElementById("startDate").value) / 1000;
          const endDate = Date.parse(document.getElementById("endDate").value) / 1000;

          if (!startDate || !endDate || endDate <= startDate) {
            alert("Invalid dates. End must be after start.");
            return;
          }

          try {
            await instance.setDates(startDate, endDate, { from: App.account });
            console.log("✅ Dates set successfully");
            window.location.reload();
          } catch (err) {
            console.error("❌ Failed to set dates:", err.message);
            alert("Failed to set voting dates. Check console for details.");
          }
        });

        // Load candidates
        for (let i = 0; i < countCandidates; i++) {
          const data = await instance.getCandidate(i + 1);
          const id = data[0];
          const name = data[1];
          const party = data[2];
          const voteCount = data[3];

          const row = `
            <tr>
              <td><input class="form-check-input" type="radio" name="candidate" value="${id}" id=${id}> ${name}</td>
              <td>${party}</td>
              <td>${voteCount}</td>
            </tr>`;
          $("#boxCandidate").append(row);
        }

        // Enable vote if not voted
        const hasVoted = await instance.checkVote();
        if (!hasVoted) {
          $("#voteButton").attr("disabled", false);
        }
      } catch (err) {
        console.error("❌ Initialization error:", err.message);
      }

    } else {
      alert("🦊 MetaMask not detected. Please install it.");
    }
  },

  vote: async function () {
    const candidateID = $("input[name='candidate']:checked").val();
    if (!candidateID) {
      $("#msg").html("<p>Please select a candidate.</p>");
      return;
    }

    try {
      const instance = await VotingContract.deployed();
      await instance.vote(parseInt(candidateID), { from: App.account });
      console.log("✅ Vote submitted.");
      $("#voteButton").attr("disabled", true);
      $("#msg").html("<p>Vote recorded.</p>");
      window.location.reload();
    } catch (err) {
      console.error("❌ Voting error:", err.message);
      $("#msg").html("<p>Error voting. Check console.</p>");
    }
  }
};

// 🔄 On load
window.addEventListener("load", () => {
  App.eventStart();
});
