module MyModule::ClassroomCrowdfund {

    use aptos_framework::signer;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;

    /// Resource representing a classroom resource crowdfund project
    struct ClassroomProject has key {
        goal: u64,          // Target funding goal
        total_funds: u64,   // Total contributions received
    }

    /// Function to create a new classroom project with a funding goal
    public entry fun create_project(owner: &signer, goal: u64) {
        move_to(owner, ClassroomProject {
            goal,
            total_funds: 0,
        });
    }

    /// Function to contribute AptosCoin to a classroom project
    public entry fun contribute(
        contributor: &signer,
        project_owner: address,
        amount: u64
    ) acquires ClassroomProject {
        let project = borrow_global_mut<ClassroomProject>(project_owner);

        // Transfer coins from contributor to project owner
        let donation = coin::withdraw<AptosCoin>(contributor, amount);
        coin::deposit<AptosCoin>(project_owner, donation);

        // Update total funds raised
        project.total_funds = project.total_funds + amount;
    }
}
